import { AppShell } from "../../../components/app-shell";
import { CheckoutClient } from "../../../components/checkout-client";

export default async function PayPage({
  params
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  return (
    <AppShell>
      <CheckoutClient invoiceId={invoiceId} />
    </AppShell>
  );
}

