import { AppShell } from "../../components/app-shell";
import { CustomerStorefrontClient } from "../../components/customer-storefront-client";
import { RoleGate } from "../../components/role-gate";

export default function StorePage() {
  return (
    <AppShell>
      <RoleGate role="customer">
        <CustomerStorefrontClient />
      </RoleGate>
    </AppShell>
  );
}
