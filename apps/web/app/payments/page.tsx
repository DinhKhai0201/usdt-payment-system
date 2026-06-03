import { AppShell } from "../../components/app-shell";

export default function PaymentsPage() {
  return (
    <AppShell>
      <section>
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">
          Payment detail list can be extended next, but the core demo flow already surfaces confirmed transactions in
          checkout and dashboard.
        </p>
      </section>
      <div className="card">
        This page is intentionally light for now so the project stays focused on the main invoice and confirmation
        flow.
      </div>
    </AppShell>
  );
}
