export type DbInvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "WAITING_PAYMENT"
  | "CONFIRMING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERPAID"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type DbDepositStatus = "DETECTED" | "CONFIRMED" | "FAILED";
export type WalletVaultType = "MASTER" | "HOT" | "TREASURY" | "GAS";
export type DepositAddressStatus = "AVAILABLE" | "ASSIGNED" | "FUNDED" | "SWEPT" | "ARCHIVED";
export type SweepStatus = "PENDING" | "COMPLETED" | "FAILED";
export type GasTopUpStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface MerchantRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletVaultRecord {
  id: string;
  merchantId: string;
  network: string;
  type: WalletVaultType;
  label: string;
  address: string;
  derivationRoot: string | null;
  nativeBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepositAddressRecord {
  id: string;
  merchantId: string;
  invoiceId: string | null;
  parentVaultId: string;
  network: string;
  address: string;
  derivationPath: string;
  index: number;
  status: DepositAddressStatus;
  assignedAt: string | null;
  fundedAt: string | null;
  sweptAt: string | null;
  balanceCents: number;
  nativeBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecordDb {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amountCents: number;
  asset: string;
  network: string;
  description: string | null;
  paymentAddress: string;
  status: DbInvoiceStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  merchantId: string;
  detectedAmountCents: number;
}

export interface DepositRecord {
  id: string;
  invoiceId: string;
  network: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountCents: number;
  confirmations: number;
  status: DbDepositStatus;
  detectedAt: string;
  confirmedAt: string | null;
  rawPayload: string | null;
}

export interface LedgerEntryRecord {
  id: string;
  merchantId: string;
  invoiceId: string;
  entryType: string;
  amountCents: number;
  asset: string;
  network: string;
  direction: "CREDIT" | "DEBIT";
  status: string;
  createdAt: string;
}

export interface SweepRecord {
  id: string;
  merchantId: string;
  invoiceId: string;
  depositAddressId: string;
  fromAddress: string;
  toVaultId: string;
  toAddress: string;
  network: string;
  amountCents: number;
  status: SweepStatus;
  txHash: string;
  createdAt: string;
  completedAt: string | null;
}

export interface GasTopUpRecord {
  id: string;
  merchantId: string;
  invoiceId: string;
  depositAddressId: string;
  fromVaultId: string;
  fromAddress: string;
  toAddress: string;
  network: string;
  nativeAmount: number;
  status: GasTopUpStatus;
  txHash: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DatabaseShape {
  merchants: MerchantRecord[];
  walletVaults: WalletVaultRecord[];
  depositAddresses: DepositAddressRecord[];
  invoices: InvoiceRecordDb[];
  deposits: DepositRecord[];
  ledger: LedgerEntryRecord[];
  sweeps: SweepRecord[];
  gasTopUps: GasTopUpRecord[];
}
