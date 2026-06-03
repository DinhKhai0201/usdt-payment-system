import { AppShell } from "../../components/app-shell";
import { AdminPortalClient } from "../../components/admin-portal-client";
import { RoleGate } from "../../components/role-gate";

export default function AdminPortalPage() {
  return (
    <AppShell>
      <RoleGate role="admin">
        <AdminPortalClient />
      </RoleGate>
    </AppShell>
  );
}
