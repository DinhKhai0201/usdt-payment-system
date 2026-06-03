import type { CheckoutInvoice, InvoiceRecord, PaymentTimelineStep } from "@payflow/shared";

type InvoiceLike = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amountCents: number;
  asset: string;
  network: string;
  description: string | null;
  paymentAddress: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  detectedAmountCents: number;
  deposits?: Array<{
    txHash: string;
    confirmations: number;
    status: string;
  }>;
};

import { formatUsdToken } from "./format";

export function toInvoiceRecord(invoice: InvoiceLike): InvoiceRecord {
  const latestDeposit = invoice.deposits?.[0] ?? null;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    amountCents: invoice.amountCents,
    amountFormatted: `${formatUsdToken(invoice.amountCents)} ${invoice.asset}`,
    asset: invoice.asset,
    network: invoice.network as InvoiceRecord["network"],
    description: invoice.description,
    paymentAddress: invoice.paymentAddress,
    status: invoice.status as InvoiceRecord["status"],
    expiresAt: invoice.expiresAt,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt,
    lastTxHash: latestDeposit?.txHash ?? null,
    lastPaidAmountFormatted:
      invoice.detectedAmountCents > 0 ? `${formatUsdToken(invoice.detectedAmountCents)} ${invoice.asset}` : null,
    confirmations: latestDeposit?.confirmations ?? 0
  };
}

export function toCheckoutInvoice(invoice: InvoiceLike, merchantName: string): CheckoutInvoice {
  const record = toInvoiceRecord(invoice);
  return {
    ...record,
    merchantName,
    timeRemainingMs: Math.max(new Date(record.expiresAt).getTime() - Date.now(), 0),
    paymentTimeline: makeTimeline(record.status)
  };
}

function makeTimeline(status: InvoiceRecord["status"]): PaymentTimelineStep[] {
  const confirming = status === "CONFIRMING";
  const paid = status === "PAID" || status === "OVERPAID";

  return [
    {
      key: "awaiting",
      label: "Awaiting Payment",
      description: "Waiting for USDT transfer",
      active: !confirming && !paid,
      completed: confirming || paid
    },
    {
      key: "confirming",
      label: "Confirming",
      description: "Checking blockchain confirmations",
      active: confirming,
      completed: paid
    },
    {
      key: "paid",
      label: "Paid",
      description: "Payment completed",
      active: paid,
      completed: paid
    }
  ];
}
