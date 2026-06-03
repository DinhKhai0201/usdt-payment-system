"use client";

import type { DashboardOverview } from "@payflow/shared";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { StatusBadge } from "./status-badge";

export function DashboardClient() {
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    void apiGet<DashboardOverview>("/dashboard/overview").then(setData);
  }, []);

  if (!data) {
    return <div className="card">Loading dashboard...</div>;
  }

  return (
    <>
      <section>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Merchant overview, payment watcher health and recent invoice activity.</p>
      </section>

      <section className="grid metrics">
        {data.metrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <div className="muted">{metric.label}</div>
            <div className="metric-value">{metric.value}</div>
            <div className={`trend-${metric.trend}`}>{metric.change}</div>
          </div>
        ))}
      </section>

      <section className="split">
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 14 }}>Recent invoices</div>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Network</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.customerName}</td>
                  <td>{invoice.amountFormatted}</td>
                  <td>{invoice.network}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Supported networks</div>
            {data.networkStatus.map((item) => (
              <div
                key={item.network}
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.network}</div>
                  <div className="muted">{item.label}</div>
                </div>
                <div className={`status-${item.status}`}>{item.status}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>System status</div>
            {data.systemStatus.map((item) => (
              <div
                key={item.service}
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}
              >
                <span>{item.service}</span>
                <span className="system-ok">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

