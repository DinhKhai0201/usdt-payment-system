"use client";

import type { CheckoutInvoice } from "@payflow/shared";
import { Copy, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { apiGet } from "../lib/api";
import { StatusBadge } from "./status-badge";
import { readSession } from "../lib/demo-wallet";
import { ethers } from "ethers";

const MOCK_USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC20_ABI = ["function transfer(address to, uint256 amount) external returns (bool)"];

function formatTime(ms: number) {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CheckoutClient({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<CheckoutInvoice | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const session = readSession();

  async function loadInvoice() {
    const res = await apiGet<CheckoutInvoice>(`/public/invoices/${invoiceId}`);
    setInvoice(res);
  }

  useEffect(() => {
    void loadInvoice();
    const interval = setInterval(() => {
      void loadInvoice();
    }, 4000);
    return () => clearInterval(interval);
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice?.expiresAt) return;
    const expires = new Date(invoice.expiresAt).getTime();
    
    const tick = () => {
      setTimeLeft(expires - Date.now());
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [invoice?.expiresAt]);

  const paymentUri = useMemo(() => {
    if (!invoice) return "";
    return `payflow:${invoice.paymentAddress}?amount=${invoice.amountCents / 100}&asset=${invoice.asset}&network=${invoice.network}`;
  }, [invoice]);

  async function submitPayment() {
    if (!invoice || !session?.privateKey) return;
    setBusy(true);
    setError(null);
    try {
      // NOTE: This logic of keeping a private key in the frontend and creating a provider 
      // is STRICTLY FOR LOCAL DEMOS. Real users would use MetaMask or WalletConnect.
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const wallet = new ethers.Wallet(session.privateKey, provider);
      const contract = new ethers.Contract(MOCK_USDT_ADDRESS, ERC20_ABI, wallet);

      const amountUnits = BigInt(invoice.amountCents) * 10000n; // cents to 6 decimals
      const tx = await contract.transfer(invoice.paymentAddress, amountUnits);
      await tx.wait(); // wait for confirmation
      
      await loadInvoice();
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!invoice) {
    return <div className="card">Loading checkout...</div>;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: 40, borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
        <div>
          <h1 className="page-title">Checkout</h1>
          <p className="page-subtitle">{invoice.merchantName}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="actor-kicker">Amount Due</div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>{invoice.amountFormatted}</div>
        </div>
      </div>

      <div className="split" style={{ alignItems: "flex-start" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 16 }}>
            <QRCode value={paymentUri} size={200} />
          </div>
          <div className="muted" style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Scan to pay with a mobile wallet</span>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="muted">Status</div>
              <StatusBadge status={invoice.status} />
            </div>
            
            {invoice.status === "WAITING_PAYMENT" && timeLeft > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="muted">Expires in</div>
                <div style={{ fontWeight: 600, color: "var(--warning)" }}>{formatTime(timeLeft)}</div>
              </div>
            )}
            {invoice.status === "WAITING_PAYMENT" && timeLeft <= 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="muted">Expires in</div>
                <div style={{ fontWeight: 600, color: "var(--danger)" }}>Expired</div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }}></div>

            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Network</div>
              <div style={{ fontWeight: 600 }}>{invoice.network}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Send to address</div>
              <div className="mono" style={{ fontSize: "0.9rem", wordBreak: "break-all" }}>{invoice.paymentAddress}</div>
            </div>
          </div>

          <div className="card">
             <div className="actor-title">Pay with Built-in Demo Wallet</div>

            {!session ? (
              <p className="muted" style={{ marginTop: 16 }}>
                Please select a Demo Wallet from the Home Page to pay this invoice.
              </p>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 16 }}>
                  You are using <strong>{session.name}</strong>. Clicking the button below will instantly execute a real EVM `transfer` transaction on the local Anvil network.
                </p>

                {error && (
                  <div style={{ padding: 12, background: "rgba(255,0,0,0.1)", color: "var(--danger)", borderRadius: 8, marginTop: 12, fontSize: 14 }}>
                    {error.split("\n")[0]}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                  <button className="btn btn-primary" disabled={busy || invoice.status === "PAID"} onClick={submitPayment}>
                    {busy ? "Processing EVM Tx..." : `Pay as ${session.name}`}
                  </button>
                  <button className="btn btn-secondary" onClick={() => void loadInvoice()}>
                    <RefreshCcw size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
