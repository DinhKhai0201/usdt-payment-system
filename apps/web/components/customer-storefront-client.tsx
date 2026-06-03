"use client";

import { useState } from "react";
import { apiPost } from "../lib/api";
import type { InvoiceRecord } from "@payflow/shared";
import { readSession } from "../lib/demo-auth";

const products = [
  {
    id: "prod-website",
    name: "Website Launch Package",
    description: "A merchant-facing digital service product for the checkout demo.",
    amountCents: 500
  },
  {
    id: "prod-growth",
    name: "Growth Retainer",
    description: "A higher-ticket service used to show a second order path.",
    amountCents: 999
  }
];

export function CustomerStorefrontClient() {
  const [busyProduct, setBusyProduct] = useState<string | null>(null);

  async function createOrder(product: (typeof products)[number]) {
    const session = readSession();
    if (!session) {
      return;
    }
    setBusyProduct(product.id);
    try {
      const invoice = await apiPost<InvoiceRecord>("/invoices", {
        customerName: session.name,
        customerEmail: `${session.address.slice(0, 8)}@wallet.demo`,
        amountCents: product.amountCents,
        network: "ERC20",
        description: product.name,
        expiryMinutes: 30
      });
      window.location.href = `/orders/${invoice.id}`;
    } finally {
      setBusyProduct(null);
    }
  }

  return (
    <>
      <section>
        <h1 className="page-title">Merchant Storefront</h1>
        <p className="page-subtitle">Customer lands on the merchant shop, picks a product, and creates a payable order.</p>
      </section>

      <section className="actor-grid">
        {products.map((product) => (
          <div key={product.id} className="actor-card">
            <div className="actor-kicker">Digital product</div>
            <div className="actor-title">{product.name}</div>
            <p className="muted">{product.description}</p>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, margin: "16px 0" }}>
              {(product.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
            </div>
            <button className="btn btn-primary" disabled={busyProduct === product.id} onClick={() => void createOrder(product)}>
              {busyProduct === product.id ? "Creating order..." : "Create order"}
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
