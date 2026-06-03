import { AppShell } from "../../components/app-shell";
import { MerchantPortalClient } from "../../components/merchant-portal-client";
import { RoleGate } from "../../components/role-gate";

export default function MerchantPortalPage() {
  return (
    <AppShell>
      <RoleGate role="merchant">
        <MerchantPortalClient />
      </RoleGate>
    </AppShell>
  );
}
