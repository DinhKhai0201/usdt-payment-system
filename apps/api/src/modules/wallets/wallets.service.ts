import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class WalletsService implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {}

  onModuleInit() {
    setInterval(() => {
      void this.sweepFundedDepositAddresses();
    }, 6_000);
  }

  async assignDepositAddressToInvoice(merchantId: string, invoiceId: string, network: string) {
    return this.database.reserveDepositAddress({ merchantId, invoiceId, network });
  }

  async recordIncomingFunds(address: string, amountCents: number) {
    return this.database.markDepositAddressFunded(address, amountCents);
  }

  async sweepFundedDepositAddresses() {
    const invoices = this.database.listInvoices();
    const addresses = this.database.listDepositAddresses();
    const minGasByNetwork: Record<string, number> = {
      ERC20: 1
    };

    for (const address of addresses) {
      if (address.status !== "FUNDED" || !address.invoiceId || address.balanceCents <= 0) {
        continue;
      }

      const invoice = invoices.find((item) => item.id === address.invoiceId);
      if (!invoice || !["PAID", "OVERPAID", "PARTIALLY_PAID"].includes(invoice.status)) {
        continue;
      }

      const hotVault = this.database.getHotVault(address.network);
      if (!hotVault) {
        continue;
      }

      const existing = this.database
        .listSweeps()
        .find((sweep) => sweep.depositAddressId === address.id && sweep.status === "COMPLETED");

      if (existing) {
        continue;
      }

      const requiredGas = minGasByNetwork[address.network] ?? 1;
      if (address.nativeBalance < requiredGas) {
        const gasVault = this.database.getGasVault(address.network);
        if (!gasVault) {
          continue;
        }

        const existingTopUp = this.database
          .listGasTopUps()
          .find((topUp) => topUp.depositAddressId === address.id && topUp.status === "COMPLETED");

        if (!existingTopUp) {
          const topUp = await this.database.createGasTopUp({
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            depositAddressId: address.id,
            fromVaultId: gasVault.id,
            fromAddress: gasVault.address,
            toAddress: address.address,
            network: address.network,
            nativeAmount: requiredGas,
            status: "PENDING",
            txHash: `0xgas${randomUUID().replaceAll("-", "")}`
          });
          await this.database.completeGasTopUp(topUp.id, new Date().toISOString());
        }
      }

      const sweep = await this.database.createSweep({
        merchantId: invoice.merchantId,
        invoiceId: invoice.id,
        depositAddressId: address.id,
        fromAddress: address.address,
        toVaultId: hotVault.id,
        toAddress: hotVault.address,
        network: address.network,
        amountCents: address.balanceCents,
        status: "PENDING",
        txHash: `0xsweep${randomUUID().replaceAll("-", "")}`
      });

      await this.database.completeSweep(sweep.id, new Date().toISOString());
    }
  }

  getWalletOverview() {
    const vaults = this.database.listWalletVaults();
    const depositAddresses = this.database.listDepositAddresses();
    const sweeps = this.database.listSweeps();
    const hotByNetwork = new Map(vaults.filter((vault) => vault.type === "HOT").map((vault) => [vault.network, vault.address]));
    const gasByNetwork = new Map(vaults.filter((vault) => vault.type === "GAS").map((vault) => [vault.network, vault.address]));

    return {
      walletSystem: vaults.map((vault) => ({
        id: vault.id,
        network: vault.network,
        type: vault.type,
        label: vault.label,
        address: vault.address,
        derivationRoot: vault.derivationRoot,
        nativeBalance: vault.nativeBalance
      })),
      depositPool: depositAddresses.map((address) => ({
        id: address.id,
        network: address.network,
        address: address.address,
        derivationPath: address.derivationPath,
        status: address.status,
        invoiceId: address.invoiceId,
        balanceCents: address.balanceCents,
        nativeBalance: address.nativeBalance
      })),
      gasTopUps: this.database.listGasTopUps().map((topUp) => ({
        invoiceId: topUp.invoiceId,
        fromAddress: topUp.fromAddress,
        toAddress: topUp.toAddress,
        network: topUp.network,
        nativeAmount: topUp.nativeAmount,
        txHash: topUp.txHash,
        status: topUp.status
      })),
      sweepSummary: sweeps.map((sweep) => ({
        invoiceId: sweep.invoiceId,
        fromAddress: sweep.fromAddress,
        toAddress: sweep.toAddress,
        network: sweep.network,
        amountCents: sweep.amountCents,
        txHash: sweep.txHash,
        status: sweep.status
      })),
      hotByNetwork: Object.fromEntries(hotByNetwork),
      gasByNetwork: Object.fromEntries(gasByNetwork)
    };
  }

  explainWalletFlow(invoiceId: string) {
    const invoice = this.database.findInvoice(invoiceId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    const depositAddress = this.database.findDepositAddressByInvoice(invoice.id);
    const gasVault = this.database.getGasVault(invoice.network);
    const hotVault = this.database.getHotVault(invoice.network);
    const sweep = this.database.listSweeps().find((item) => item.invoiceId === invoice.id) ?? null;
    const gasTopUp = this.database.listGasTopUps().find((item) => item.invoiceId === invoice.id) ?? null;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerPaysTo: depositAddress?.address ?? invoice.paymentAddress,
      derivedFrom: depositAddress?.derivationPath ?? null,
      gasPolicy: gasVault
        ? `If ${depositAddress?.address ?? invoice.paymentAddress} lacks gas, ${gasVault.address} tops it up first.`
        : "Gas wallet is not configured.",
      afterReceiveFunds: hotVault
        ? `System sweeps confirmed funds from deposit address to hot wallet ${hotVault.address}.`
        : "Hot wallet is not configured.",
      latestGasTopUp: gasTopUp,
      latestSweep: sweep
    };
  }
}
