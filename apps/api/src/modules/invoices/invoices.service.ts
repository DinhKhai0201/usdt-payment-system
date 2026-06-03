import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { makeInvoiceNumber } from "../../common/format";
import { toCheckoutInvoice, toInvoiceRecord } from "../../common/mappers";
import { WalletsService } from "../wallets/wallets.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly walletsService: WalletsService
  ) {}

  async listInvoices() {
    await this.expireInvoices();
    const invoices = this.database.listInvoices();
    const deposits = this.database.listDeposits();
    return invoices.map((invoice) =>
      toInvoiceRecord({
        ...invoice,
        deposits: deposits.filter((deposit) => deposit.invoiceId === invoice.id).slice(0, 1)
      })
    );
  }

  async createInvoice(input: CreateInvoiceDto) {
    const merchant = this.database.getMerchant();
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }
    const count = this.database.listInvoices().length;
    const invoiceNumber = makeInvoiceNumber(count);
    const invoice = await this.database.createInvoice({
      merchantId: merchant.id,
      invoiceNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail ?? null,
      amountCents: input.amountCents,
      network: input.network,
      description: input.description ?? null,
      status: "WAITING_PAYMENT",
      expiresAt: new Date(Date.now() + (input.expiryMinutes ?? 30) * 60_000).toISOString(),
      paymentAddress: `ALLOCATING-${invoiceNumber}`
    });

    const depositAddress = await this.walletsService.assignDepositAddressToInvoice(merchant.id, invoice.id, input.network);
    const updatedInvoice = await this.database.updateInvoice(invoice.id, {
      paymentAddress: depositAddress.address
    });

    return toInvoiceRecord({ ...(updatedInvoice ?? invoice), deposits: [] });
  }

  async getPublicInvoice(idOrNumber: string) {
    await this.expireInvoices();

    const merchant = this.database.getMerchant();
    const invoice = this.database.findInvoice(idOrNumber);

    if (!invoice || !merchant) {
      throw new NotFoundException("Invoice not found");
    }

    const deposits = this.database.listDeposits().filter((deposit) => deposit.invoiceId === invoice.id).slice(0, 1);
    return toCheckoutInvoice({ ...invoice, deposits }, merchant.name);
  }

  private async expireInvoices() {
    await this.database.expireInvoices();
  }
}
