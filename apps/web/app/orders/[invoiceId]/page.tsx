import { AppShell } from "../../../components/app-shell";
import { CustomerOrderClient } from "../../../components/customer-order-client";
import { RoleGate } from "../../../components/role-gate";

export default async function OrderPage({
  params
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  return (
    <AppShell>
      <RoleGate role="customer">
        <CustomerOrderClient invoiceId={invoiceId} />
      </RoleGate>
    </AppShell>
  );
}
