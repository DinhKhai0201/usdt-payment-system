"use client";

import type { CheckoutInvoice } from "@payflow/shared";
import { Copy, RefreshCcw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { readSession } from "../lib/demo-wallet";
import { ethers } from "ethers";

const MOCK_USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC20_ABI = ["function transfer(address to, uint256 amount) external returns (bool)"];

type WalletExplain = {
  customerPaysTo: string;
  latestGasTopUp: null | { txHash: string };
  latestSweep: null | { txHash: string };
};

export function CustomerOrderClient({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<CheckoutInvoice | null>(null);
  const [walletExplain, setWalletExplain] = useState<WalletExplain | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const session = readSession();

  async function refresh() {
    const [invoiceResult, explainResult] = await Promise.all([
      apiGet<CheckoutInvoice>(`/public/invoices/${invoiceId}`),
      apiGet<WalletExplain>(`/wallets/explain/${invoiceId}`)
    ]);
    setInvoice(invoiceResult);
    setWalletExplain(explainResult);
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [invoiceId]);

  const paymentReady = useMemo(() => invoice?.status === "PAID" || invoice?.status === "OVERPAID", [invoice?.status]);

  async function submitPayment() {
    if (!invoice || !session?.privateKey) return;
    setBusy(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const wallet = new ethers.Wallet(session.privateKey, provider);
      const contract = new ethers.Contract(MOCK_USDT_ADDRESS, ERC20_ABI, wallet);

      const amountUnits = BigInt(invoice.amountCents) * 10000n; // cents to 6 decimals
      const tx = await contract.transfer(invoice.paymentAddress, amountUnits);
      await tx.wait(); // wait for confirmation
      
      await refresh();
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return <div className="card">Loading order...</div>;
  }

  return (
    <>
      <section>
        <h1 className="page-title">Order Payment</h1>
        <p className="page-subtitle">Customer waits on this order page for the watcher to confirm the real USDT transfer on the local EVM network.</p>
      </section>

      <section className="split" style={{ gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div className="card">
          <div className="actor-kicker">Order</div>
          <div className="actor-title">{invoice.invoiceNumber}</div>
          <div className="form-grid">
            <InfoLine label="Product / description" value={invoice.description ?? "No description"} />
            <InfoLine label="Amount" value={invoice.amountFormatted} />
            <InfoLine label="Network" value={invoice.network} />
            <InfoLine label="Deposit address" value={<span className="mono">{invoice.paymentAddress}</span>} />
            <InfoLine label="Status" value={<span className={`status-badge status-${invoice.status.toLowerCase()}`}>{invoice.status}</span>} />
          </div>
        </div>

        <div className="card">
          <div className="actor-kicker">Payment Methods</div>
          <div className="actor-title">Pay with Built-in Demo Wallet</div>
          
          {!session ? (
            <p className="muted" style={{ marginTop: 16 }}>
              Please select a Demo Wallet from the Home Page to complete the payment.
            </p>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 16 }}>
                You are using <strong>{session.name}</strong>. Clicking the button below will instantly execute a real EVM `transfer` transaction on the local Anvil network using this pre-funded account.
              </p>
              
              {error && (
                <div style={{ padding: 12, background: "rgba(255,0,0,0.1)", color: "var(--danger)", borderRadius: 8, marginTop: 12, fontSize: 14 }}>
                  {error.split("\n")[0]}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <button className="btn btn-primary" disabled={busy || paymentReady} onClick={submitPayment}>
                  <Wallet size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                  {busy ? "Processing EVM Tx..." : `Pay as ${session.name}`}
                </button>
                <button className="btn btn-secondary" onClick={() => void refresh()}>
                  <RefreshCcw size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                  Refresh Status
                </button>
              </div>
            </>
          )}

          <div className="card" style={{ marginTop: 24, padding: "16px 20px" }}>
            <div className="muted" style={{ fontSize: "0.9rem" }}>Send to address</div>
            <div className="mono" style={{ marginTop: 8, fontSize: "1.05rem" }}>{walletExplain?.customerPaysTo ?? invoice.paymentAddress}</div>
            <button className="btn btn-secondary" style={{ marginTop: 12, padding: "8px 14px", fontSize: "0.85rem" }} onClick={() => navigator.clipboard.writeText(invoice.paymentAddress)}>
              <Copy size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Copy address
            </button>
          </div>

          <div style={{ marginTop: 32 }}>
            <div className="actor-kicker" style={{ marginBottom: 16 }}>Live Payment Status</div>
            <div className="flow-strip" style={{ gap: 8 }}>
              <MiniStep done={Boolean(invoice.lastTxHash)} title="Detected" />
              <MiniStep done={(invoice.confirmations ?? 0) > 0} title="Confirming" />
              <MiniStep done={Boolean(walletExplain?.latestGasTopUp)} title="Gas top-up" />
              <MiniStep done={Boolean(walletExplain?.latestSweep)} title="Swept" />
              <MiniStep done={paymentReady} title="Success" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 500, fontSize: "1.05rem" }}>{value}</div>
    </div>
  );
}

function MiniStep({ done, title }: { done: boolean; title: string }) {
  return (
    <div 
      className={`flow-step ${done ? "done active" : ""}`} 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        gap: 10, 
        textAlign: "center", 
        padding: "16px 8px",
        background: done ? "rgba(30, 169, 91, 0.08)" : "transparent",
        borderColor: done ? "rgba(30, 169, 91, 0.3)" : "var(--line)",
        borderStyle: done ? "solid" : "dashed"
      }}
    >
      <div style={{ 
        width: 28, 
        height: 28, 
        borderRadius: 14, 
        background: done ? "var(--green)" : "rgba(0,0,0,0.05)",
        color: done ? "white" : "var(--text-soft)",
        display: "grid",
        placeItems: "center",
        fontWeight: "bold",
        fontSize: "0.9rem"
      }}>
        {done ? "✓" : "..."}
      </div>
      <div style={{ 
        fontSize: "0.85rem", 
        fontWeight: done ? 600 : 500, 
        color: done ? "var(--green-deep)" : "var(--text-soft)",
        lineHeight: 1.2
      }}>
        {title}
      </div>
    </div>
  );
}
