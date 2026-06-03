import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { ethers } from "ethers";
import type {
  DatabaseShape,
  DbInvoiceStatus,
  DepositAddressRecord,
  DepositRecord,
  GasTopUpRecord,
  InvoiceRecordDb,
  LedgerEntryRecord,
  MerchantRecord,
  SweepRecord,
  WalletVaultRecord
} from "./database.types";

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly dbPath = join(process.cwd(), "data", "demo-db.json");
  private db: DatabaseShape = {
    merchants: [],
    walletVaults: [],
    depositAddresses: [],
    invoices: [],
    deposits: [],
    ledger: [],
    sweeps: [],
    gasTopUps: []
  };

  async onModuleInit() {
    await mkdir(dirname(this.dbPath), { recursive: true });
    await this.load();

    if (this.shouldReseed()) {
      await this.seed();
    }
  }

  async seed() {
    const createdAt = nowIso();
    const merchant: MerchantRecord = {
      id: randomUUID(),
      name: process.env.DEFAULT_MERCHANT_NAME ?? "PayFlow Studio",
      email: process.env.DEFAULT_MERCHANT_EMAIL ?? "merchant@payflow.local",
      createdAt,
      updatedAt: createdAt
    };

    const walletVaults = this.makeWalletVaults(merchant);
    const erc20MasterVault = walletVaults.find((vault) => vault.type === "MASTER" && vault.network === "ERC20")!;

    const acmeDepositAddress = this.makeDepositAddress({
      merchantId: merchant.id,
      parentVaultId: erc20MasterVault.id,
      network: "ERC20",
      index: 0,
      invoiceId: null
    });
    this.db = {
      merchants: [merchant],
      walletVaults,
      depositAddresses: [acmeDepositAddress],
      invoices: [],
      deposits: [],
      ledger: [],
      sweeps: [],
      gasTopUps: []
    };

    await this.persist();
  }

  getMerchant() {
    return this.db.merchants[0] ?? null;
  }

  listInvoices() {
    return [...this.db.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listWalletVaults() {
    return [...this.db.walletVaults];
  }

  findWalletVaultById(vaultId: string) {
    return this.db.walletVaults.find((vault) => vault.id === vaultId) ?? null;
  }

  getTreasuryVault(network: string) {
    return this.db.walletVaults.find((vault) => vault.type === "TREASURY" && vault.network === network) ?? null;
  }

  getHotVault(network: string) {
    return this.db.walletVaults.find((vault) => vault.type === "HOT" && vault.network === network) ?? null;
  }

  getGasVault(network: string) {
    return this.db.walletVaults.find((vault) => vault.type === "GAS" && vault.network === network) ?? null;
  }

  getMasterVault(network: string) {
    return this.db.walletVaults.find((vault) => vault.type === "MASTER" && vault.network === network) ?? null;
  }

  listDepositAddresses() {
    return [...this.db.depositAddresses];
  }

  findDepositAddressByInvoice(invoiceId: string) {
    return this.db.depositAddresses.find((address) => address.invoiceId === invoiceId) ?? null;
  }

  findDepositAddressByAddress(address: string) {
    return this.db.depositAddresses.find((item) => item.address === address) ?? null;
  }

  listSweeps() {
    return [...this.db.sweeps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listGasTopUps() {
    return [...this.db.gasTopUps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findInvoice(idOrNumber: string) {
    return this.db.invoices.find((invoice) => invoice.id === idOrNumber || invoice.invoiceNumber === idOrNumber) ?? null;
  }

  listDeposits() {
    return [...this.db.deposits].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  listLedger() {
    return [...this.db.ledger];
  }

  async createInvoice(input: {
    invoiceNumber: string;
    merchantId: string;
    customerName: string;
    customerEmail: string | null;
    amountCents: number;
    network: string;
    description: string | null;
    expiresAt: string;
    status: DbInvoiceStatus;
    paymentAddress: string;
  }) {
    const invoice = this.createInvoiceRecord({
      ...input,
      paidAt: null,
      detectedAmountCents: 0
    });
    this.db.invoices.unshift(invoice);
    await this.persist();
    return invoice;
  }

  async updateInvoice(id: string, patch: Partial<InvoiceRecordDb>) {
    const invoice = this.findInvoice(id);
    if (!invoice) {
      return null;
    }
    Object.assign(invoice, patch, { updatedAt: nowIso() });
    await this.persist();
    return invoice;
  }

  async createDeposit(input: Omit<DepositRecord, "id" | "detectedAt" | "confirmedAt"> & { confirmedAt?: string | null }) {
    const deposit: DepositRecord = {
      id: randomUUID(),
      detectedAt: nowIso(),
      confirmedAt: input.confirmedAt ?? null,
      ...input
    };
    this.db.deposits.unshift(deposit);
    await this.persist();
    return deposit;
  }

  async updateDeposit(id: string, patch: Partial<DepositRecord>) {
    const deposit = this.db.deposits.find((item) => item.id === id) ?? null;
    if (!deposit) {
      return null;
    }
    Object.assign(deposit, patch);
    await this.persist();
    return deposit;
  }

  async addLedgerEntry(input: Omit<LedgerEntryRecord, "id" | "createdAt">) {
    const exists = this.db.ledger.find((entry) => entry.invoiceId === input.invoiceId && entry.entryType === input.entryType);
    if (exists) {
      return exists;
    }
    const entry: LedgerEntryRecord = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...input
    };
    this.db.ledger.unshift(entry);
    await this.persist();
    return entry;
  }

  async reserveDepositAddress(input: { merchantId: string; invoiceId: string; network: string }) {
    let depositAddress =
      this.db.depositAddresses.find(
        (address) => address.network === input.network && address.status === "AVAILABLE" && address.invoiceId === null
      ) ?? null;

    if (!depositAddress) {
      const masterVault = this.getMasterVault(input.network);
      if (!masterVault) {
        throw new Error(`No master vault configured for ${input.network}`);
      }
      const nextIndex =
        this.db.depositAddresses
          .filter((address) => address.network === input.network && address.parentVaultId === masterVault.id)
          .reduce((max, address) => Math.max(max, address.index), -1) + 1;

      depositAddress = this.makeDepositAddress({
        merchantId: input.merchantId,
        parentVaultId: masterVault.id,
        network: input.network,
        index: nextIndex,
        invoiceId: null
      });
      this.db.depositAddresses.push(depositAddress);
    }

    this.assignDepositAddress(depositAddress.id, input.invoiceId);
    await this.persist();
    return this.findDepositAddressByInvoice(input.invoiceId)!;
  }

  async markDepositAddressFunded(address: string, amountCents: number) {
    const record = this.findDepositAddressByAddress(address);
    if (!record) {
      return null;
    }
    this.creditDepositAddress(address, amountCents, nowIso());
    await this.persist();
    return record;
  }

  async createGasTopUp(input: Omit<GasTopUpRecord, "id" | "createdAt" | "completedAt"> & { completedAt?: string | null }) {
    const topUp: GasTopUpRecord = {
      id: randomUUID(),
      createdAt: nowIso(),
      completedAt: input.completedAt ?? null,
      ...input
    };
    this.db.gasTopUps.unshift(topUp);
    await this.persist();
    return topUp;
  }

  async completeGasTopUp(topUpId: string, completedAt: string) {
    const topUp = this.db.gasTopUps.find((item) => item.id === topUpId) ?? null;
    if (!topUp) {
      return null;
    }
    topUp.status = "COMPLETED";
    topUp.completedAt = completedAt;
    this.creditNativeGas(topUp.depositAddressId, topUp.nativeAmount, completedAt);
    this.debitVaultNativeGas(topUp.fromVaultId, topUp.nativeAmount, completedAt);
    await this.persist();
    return topUp;
  }

  async createSweep(input: Omit<SweepRecord, "id" | "createdAt" | "completedAt"> & { completedAt?: string | null }) {
    const sweep: SweepRecord = {
      id: randomUUID(),
      createdAt: nowIso(),
      completedAt: input.completedAt ?? null,
      ...input
    };
    this.db.sweeps.unshift(sweep);
    await this.persist();
    return sweep;
  }

  async completeSweep(sweepId: string, completedAt: string) {
    const sweep = this.db.sweeps.find((item) => item.id === sweepId) ?? null;
    if (!sweep) {
      return null;
    }
    sweep.status = "COMPLETED";
    sweep.completedAt = completedAt;
    this.markDepositAddressSwept(sweep.depositAddressId, completedAt);
    await this.persist();
    return sweep;
  }

  async expireInvoices() {
    const now = Date.now();
    let changed = false;
    for (const invoice of this.db.invoices) {
      const shouldExpire =
        ["PENDING", "WAITING_PAYMENT", "CONFIRMING"].includes(invoice.status) &&
        new Date(invoice.expiresAt).getTime() < now;
      if (shouldExpire) {
        invoice.status = "EXPIRED";
        invoice.updatedAt = nowIso();
        changed = true;
      }
    }
    if (changed) {
      await this.persist();
    }
  }

  private createInvoiceRecord(input: {
    merchantId: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string | null;
    amountCents: number;
    network: string;
    description: string | null;
    paymentAddress: string;
    status: DbInvoiceStatus;
    expiresAt: string;
    paidAt: string | null;
    detectedAmountCents: number;
  }): InvoiceRecordDb {
    const createdAt = nowIso();
    return {
      id: randomUUID(),
      invoiceNumber: input.invoiceNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      amountCents: input.amountCents,
      asset: "USDT",
      network: input.network,
      description: input.description,
      paymentAddress: input.paymentAddress,
      status: input.status,
      expiresAt: input.expiresAt,
      createdAt,
      updatedAt: createdAt,
      paidAt: input.paidAt,
      merchantId: input.merchantId,
      detectedAmountCents: input.detectedAmountCents
    };
  }

  private async load() {
    try {
      const raw = await readFile(this.dbPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DatabaseShape>;
      this.db = {
        merchants: parsed.merchants ?? [],
        walletVaults: parsed.walletVaults ?? [],
        depositAddresses: parsed.depositAddresses ?? [],
        invoices: parsed.invoices ?? [],
        deposits: parsed.deposits ?? [],
        ledger: parsed.ledger ?? [],
        sweeps: parsed.sweeps ?? [],
        gasTopUps: parsed.gasTopUps ?? []
      };
    } catch {
      this.db = {
        merchants: [],
        walletVaults: [],
        depositAddresses: [],
        invoices: [],
        deposits: [],
        ledger: [],
        sweeps: [],
        gasTopUps: []
      };
    }
  }

  private async persist() {
    await writeFile(this.dbPath, JSON.stringify(this.db, null, 2));
  }

  private shouldReseed() {
    if (this.db.merchants.length === 0 || this.db.walletVaults.length === 0 || this.db.depositAddresses.length === 0) {
      return true;
    }

    const hasHot = this.db.walletVaults.some((vault) => vault.type === "HOT");
    const hasGas = this.db.walletVaults.some((vault) => vault.type === "GAS");
    const depositShapeReady = this.db.depositAddresses.every(
      (address) => typeof address.nativeBalance === "number" && typeof address.derivationPath === "string"
    );
    const vaultShapeReady = this.db.walletVaults.every((vault) => typeof vault.nativeBalance === "number");
    const erc20Only = this.db.walletVaults.every((vault) => vault.network === "ERC20") &&
      this.db.depositAddresses.every((address) => address.network === "ERC20") &&
      this.db.invoices.every((invoice) => invoice.network === "ERC20");

    return !hasHot || !hasGas || !depositShapeReady || !vaultShapeReady || !erc20Only;
  }

  private makeWalletVaults(merchant: MerchantRecord): WalletVaultRecord[] {
    const createdAt = nowIso();
    const mnemonic = process.env.WALLET_MNEMONIC || "test test test test test test test test test test test junk";
    
    // Derived from m/44'/60'/0'/0/7
    const hotNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/7");
    
    // Derived from m/44'/60'/0'/0/8
    const gasNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/8");

    return [
      {
        id: randomUUID(),
        merchantId: merchant.id,
        network: "ERC20",
        type: "MASTER",
        label: "ERC20 Master Wallet",
        address: "0x1000000000000000000000000000000000000001",
        derivationRoot: "m/44'/60'/0'/0", // Base path for deposit addresses (will append /index)
        nativeBalance: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: randomUUID(),
        merchantId: merchant.id,
        network: "ERC20",
        type: "HOT",
        label: "ERC20 Hot Wallet",
        address: hotNode.address,
        derivationRoot: "m/44'/60'/0'/0/7",
        nativeBalance: 0,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: randomUUID(),
        merchantId: merchant.id,
        network: "ERC20",
        type: "GAS",
        label: "ERC20 Gas Wallet",
        address: gasNode.address,
        derivationRoot: "m/44'/60'/0'/0/8",
        nativeBalance: 10000 * 10**18, // 10,000 ETH natively funded by Anvil
        createdAt,
        updatedAt: createdAt
      }
    ];
  }

  private makeDepositAddress(input: {
    merchantId: string;
    parentVaultId: string;
    network: string;
    index: number;
    invoiceId: string | null;
  }): DepositAddressRecord {
    const createdAt = nowIso();
    const path = `m/44'/60'/0'/0/${input.index + 20}`;
    const mnemonic = process.env.WALLET_MNEMONIC || "test test test test test test test test test test test junk";
    const child = ethers.HDNodeWallet.fromPhrase(
      mnemonic,
      "", // password
      path
    );

    return {
      id: randomUUID(),
      merchantId: input.merchantId,
      invoiceId: input.invoiceId,
      parentVaultId: input.parentVaultId,
      network: input.network,
      address: child.address,
      derivationPath: path,
      index: input.index,
      status: input.invoiceId ? "ASSIGNED" : "AVAILABLE",
      assignedAt: input.invoiceId ? createdAt : null,
      fundedAt: null,
      sweptAt: null,
      balanceCents: 0,
      nativeBalance: 0,
      createdAt,
      updatedAt: createdAt
    };
  }

  private assignDepositAddress(addressId: string, invoiceId: string) {
    const address = this.db.depositAddresses.find((item) => item.id === addressId);
    if (!address) {
      return;
    }
    address.invoiceId = invoiceId;
    address.status = "ASSIGNED";
    address.assignedAt = nowIso();
    address.updatedAt = nowIso();
  }

  private creditDepositAddress(addressValue: string, amountCents: number, fundedAt: string) {
    const address = this.findDepositAddressByAddress(addressValue);
    if (!address) {
      return;
    }
    address.balanceCents += amountCents;
    address.fundedAt = fundedAt;
    address.status = "FUNDED";
    address.updatedAt = fundedAt;
  }

  private creditNativeGas(addressId: string, amount: number, fundedAt: string) {
    const address = this.db.depositAddresses.find((item) => item.id === addressId);
    if (!address) {
      return;
    }
    address.nativeBalance += amount;
    address.updatedAt = fundedAt;
  }

  private debitVaultNativeGas(vaultId: string, amount: number, updatedAt: string) {
    const vault = this.db.walletVaults.find((item) => item.id === vaultId);
    if (!vault) {
      return;
    }
    vault.nativeBalance = Math.max(vault.nativeBalance - amount, 0);
    vault.updatedAt = updatedAt;
  }

  private markDepositAddressSwept(addressId: string, sweptAt: string) {
    const address = this.db.depositAddresses.find((item) => item.id === addressId);
    if (!address) {
      return;
    }
    address.balanceCents = 0;
    address.nativeBalance = 0;
    address.sweptAt = sweptAt;
    address.status = "SWEPT";
    address.updatedAt = sweptAt;
  }
}
