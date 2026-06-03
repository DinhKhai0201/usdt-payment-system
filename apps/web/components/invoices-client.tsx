"use client";

import type { InvoiceRecord, SupportedNetwork } from "@payflow/shared";
import { supportedNetworks } from "@payflow/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { StatusBadge } from "./status-badge";

type CreateInvoiceForm = {
  customerName: string;
  customerEmail: string;
  amountCents: string;
  network: SupportedNetwork;
  description: string;
  expiryMinutes: string;
};

const initialForm: CreateInvoiceForm = {
  customerName: "",
  customerEmail: "",
  amountCents: "125000",
  network: "ERC20",
  description: "",
  expiryMinutes: "30"
};

export function InvoicesClient() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [form, setForm] = useState<CreateInvoiceForm>(initialForm);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadInvoices() {
    const result = await apiGet<InvoiceRecord[]>("/invoices");
    setInvoices(result);
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const q = search.toLowerCase();
      return invoice.invoiceNumber.toLowerCase().includes(q) || invoice.customerName.toLowerCase().includes(q);
    });
  }, [invoices, search]);

  async function createInvoice() {
    setIsSubmitting(true);
    try {
      const created = await apiPost<InvoiceRecord>("/invoices", {
        customerName: form.customerName,
        customerEmail: form.customerEmail || undefined,
        amountCents: Number(form.amountCents),
        network: form.network,
        description: form.description || undefined,
        expiryMinutes: Number(form.expiryMinutes)
      });
      setInvoices((current) => [created, ...current]);
      setForm(initialForm);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section>
        <h1 className="page-title">Invoices</h1>
        <p className="page-subtitle">Create invoices fast, share a checkout page and watch status move automatically.</p>
      </section>

      <section className="split">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <input
              className="field"
              placeholder="Search by invoice ID or customer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => void loadInvoices()}>
              Refresh
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Network</th>
                <th>Status</th>
                <th>Checkout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.customerName}</td>
                  <td>{invoice.amountFormatted}</td>
                  <td>{invoice.network}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td>
                    <Link href={`/pay/${invoice.id}`} style={{ color: "var(--green-deep)", fontWeight: 600 }}>
                      Open checkout
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="sheet">
          <div style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 18 }}>Create invoice</div>
          <div className="form-grid">
            <div>
              <label className="label">Customer name</label>
              <input
                className="field"
                value={form.customerName}
                onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="label">Customer email</label>
              <input
                className="field"
                value={form.customerEmail}
                onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                placeholder="billing@acme.com"
              />
            </div>
            <div>
              <label className="label">Amount (cents)</label>
              <input
                className="field"
                value={form.amountCents}
                onChange={(event) => setForm({ ...form, amountCents: event.target.value })}
              />
            </div>
            <div>
              <label className="label">Network</label>
              <select
                className="select"
                value={form.network}
                onChange={(event) => setForm({ ...form, network: event.target.value as SupportedNetwork })}
              >
                {supportedNetworks.map((network) => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Website development services"
              />
            </div>
            <div>
              <label className="label">Expiry minutes</label>
              <input
                className="field"
                value={form.expiryMinutes}
                onChange={(event) => setForm({ ...form, expiryMinutes: event.target.value })}
              />
            </div>
            <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void createInvoice()}>
              {isSubmitting ? "Creating..." : "Generate invoice"}
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}
