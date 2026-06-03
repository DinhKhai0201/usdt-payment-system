export function formatUsdToken(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountCents / 100);
}

export function makeDemoAddress(network: string, invoiceNumber: string) {
  const compact = invoiceNumber.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase();
  return `${network}-ADDR-${compact}`;
}

export function makeInvoiceNumber(count: number) {
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(count + 1).padStart(4, "0")}`;
}

