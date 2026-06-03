import type { InvoiceStatus } from "@payflow/shared";

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

