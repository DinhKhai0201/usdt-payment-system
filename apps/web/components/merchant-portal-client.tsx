"use client";

import type { DashboardOverview, InvoiceRecord } from "@payflow/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { StatusBadge } from "./status-badge";

export function MerchantPortalClient() {
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  useEffect(() => {
    void Promise.all([apiGet<DashboardOverview>("/dashboard/overview"), apiGet<InvoiceRecord[]>("/invoices")]).then(
      ([dashboardResult, invoiceResult]) => {
        setDashboard(dashboardResult);
        setInvoices(invoiceResult);
      }
    );
  }, []);

  return (
    <>
      <section>
        <h1 className="page-title">Merchant Portal</h1>
        <p className="page-subtitle">What the merchant sees after customers create orders and pay with USDT.</p>
      </section>

      <section className="grid metrics">
        {(dashboard?.metrics ?? []).map((metric) => (
          <div key={metric.label} className="metric-card">
            <div className="muted">{metric.label}</div>
            <div className="metric-value">{metric.value}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <div style={{ fontWeight: 700, fontSize: "1.15rem", marginBottom: 14 }}>Recent customer orders</div>
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Order page</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.customerName}</td>
                <td>{invoice.amountFormatted}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td><Link href={`/orders/${invoice.id}`}>Open order</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

