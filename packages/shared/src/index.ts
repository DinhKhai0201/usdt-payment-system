export const supportedNetworks = ["ERC20"] as const;

export type SupportedNetwork = (typeof supportedNetworks)[number];

export const invoiceStatuses = [
  "DRAFT",
  "PENDING",
  "WAITING_PAYMENT",
  "CONFIRMING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERPAID",
  "EXPIRED",
  "FAILED",
  "CANCELLED",
  "REFUNDED"
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type DepositStatus = "DETECTED" | "CONFIRMED" | "FAILED";

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

export interface PaymentTimelineStep {
  key: "awaiting" | "confirming" | "paid";
  label: string;
  description: string;
  active: boolean;
  completed: boolean;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amountCents: number;
  amountFormatted: string;
  asset: string;
  network: SupportedNetwork;
  description: string | null;
  paymentAddress: string;
  status: InvoiceStatus;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  lastTxHash: string | null;
  lastPaidAmountFormatted: string | null;
  confirmations: number;
}

export interface DashboardOverview {
  metrics: DashboardMetric[];
  invoices: InvoiceRecord[];
  networkStatus: Array<{
    network: SupportedNetwork;
    status: "supported" | "demo";
    label: string;
  }>;
  systemStatus: Array<{
    service: string;
    status: "operational" | "degraded";
  }>;
}

export interface CheckoutInvoice extends InvoiceRecord {
  merchantName: string;
  timeRemainingMs: number;
  paymentTimeline: PaymentTimelineStep[];
}
