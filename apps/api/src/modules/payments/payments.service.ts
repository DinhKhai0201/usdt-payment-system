import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { toInvoiceRecord } from "../../common/mappers";
import { DatabaseService } from "../database/database.service";
import { WalletsService } from "../wallets/wallets.service";

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly walletsService: WalletsService
  ) {}

  onModuleInit() {
    setInterval(() => {
      void this.processDetectedPayments();
    }, 4_000);
  }

  async listPayments() {
    const payments = this.database.listDeposits();

    return payments.map((payment) => ({
      id: payment.id,
      txHash: payment.txHash,
      network: payment.network,
      fromAddress: payment.fromAddress,
      toAddress: payment.toAddress,
      amountFormatted: `${(payment.amountCents / 100).toFixed(2)} USDT`,
      confirmations: payment.confirmations,
      status: payment.status,
      detectedAt: payment.detectedAt,
      confirmedAt: payment.confirmedAt ?? null,
      invoice: toInvoiceRecord({
        ...this.database.findInvoice(payment.invoiceId)!,
        deposits: [payment]
      })
    }));
  }

  async simulatePayment(invoiceId: string, fromAddress: string, amountCents?: number, txHashOpt?: string) {
    const invoice = this.database.findInvoice(invoiceId);

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const paymentAmount = amountCents ?? invoice.amountCents;
    const txHash = txHashOpt ?? `0x${randomUUID().replaceAll("-", "")}`;

    const payment = await this.database.createDeposit({
      invoiceId: invoice.id,
      network: invoice.network,
      txHash,
      fromAddress,
      toAddress: invoice.paymentAddress,
      amountCents: paymentAmount,
      confirmations: 0,
      status: "DETECTED",
      rawPayload: JSON.stringify({
        simulated: true,
        createdAt: new Date().toISOString()
      })
    });

    await this.database.updateInvoice(invoice.id, {
      status: "CONFIRMING",
      detectedAmountCents: paymentAmount
    });
    await this.walletsService.recordIncomingFunds(invoice.paymentAddress, paymentAmount);

    return {
      ok: true,
      txHash: payment.txHash
    };
  }

  private async processDetectedPayments() {
    const minConfirmations = Number(process.env.MIN_CONFIRMATIONS_LOCAL ?? 3);
    const pending = this.database.listDeposits().filter((deposit) => deposit.status === "DETECTED");

    for (const deposit of pending) {
      const invoice = this.database.findInvoice(deposit.invoiceId);
      if (!invoice) {
        continue;
      }
      const nextConfirmations = Math.min(deposit.confirmations + 1, minConfirmations);
      const confirmed = nextConfirmations >= minConfirmations;

      await this.database.updateDeposit(deposit.id, {
        confirmations: nextConfirmations,
        status: confirmed ? "CONFIRMED" : "DETECTED",
        confirmedAt: confirmed ? new Date().toISOString() : null
      });

      if (!confirmed) {
        continue;
      }

      const invoiceStatus =
        deposit.amountCents < invoice.amountCents
          ? "PARTIALLY_PAID"
          : deposit.amountCents > invoice.amountCents
            ? "OVERPAID"
            : "PAID";

      const updatedInvoice = await this.database.updateInvoice(deposit.invoiceId, {
        status: invoiceStatus,
        paidAt: new Date().toISOString(),
        detectedAmountCents: deposit.amountCents
      });

      if (updatedInvoice) {
        await this.database.addLedgerEntry({
          merchantId: updatedInvoice.merchantId,
          invoiceId: updatedInvoice.id,
          entryType: "DEPOSIT",
          amountCents: deposit.amountCents,
          asset: updatedInvoice.asset,
          network: updatedInvoice.network,
          direction: "CREDIT",
          status: "POSTED"
        });
        await this.walletsService.sweepFundedDepositAddresses();
      }
    }
  }
}
