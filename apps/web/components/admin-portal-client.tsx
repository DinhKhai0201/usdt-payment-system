"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

type WalletOverview = {
  walletSystem: Array<{ id: string; network: string; type: string; label: string; address: string; nativeBalance: number; usdtBalance?: number }>;
  depositPool: Array<{ id: string; address: string; status: string; invoiceId: string | null; balanceCents: number; nativeBalance: number }>;
  gasTopUps: Array<{ invoiceId: string; fromAddress: string; toAddress: string; txHash: string; status: string; nativeAmount: number }>;
  sweepSummary: Array<{ invoiceId: string; fromAddress: string; toAddress: string; txHash: string; status: string; amountCents: number }>;
};

const shorten = (str: string) => {
  if (!str) return "";
  if (str.length < 12) return str;
  return `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;
};

export function AdminPortalClient() {
  const [overview, setOverview] = useState<WalletOverview | null>(null);

  useEffect(() => {
    const load = async () => {
      const result = await apiGet<WalletOverview>("/wallets/overview");
      setOverview(result);
    };
    void load();
    const interval = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <section>
        <h1 className="page-title">Admin Portal</h1>
        <p className="page-subtitle">Operational view of wallet roles, deposit addresses, gas top-ups, and final sweeps.</p>
      </section>

      <section className="split">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Wallet system</div>
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Address</th>
                <th>USDT balance</th>
                <th>Native balance</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.walletSystem ?? []).map((vault) => (
                <tr key={vault.id}>
                  <td>{vault.type}</td>
                  <td className="mono" title={vault.address}>{shorten(vault.address)}</td>
                  <td style={{ fontWeight: 600, color: "var(--primary)" }}>{vault.usdtBalance?.toFixed(2) ?? "0.00"}</td>
                  <td>{vault.nativeBalance > 0 ? (vault.nativeBalance / 1e18).toString() + " ETH" : "0 ETH"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Deposit pool</div>
          <table className="table">
            <thead>
              <tr>
                <th>Deposit address</th>
                <th>Status</th>
                <th>USDT balance</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.depositPool ?? []).map((address) => (
                <tr key={address.id}>
                  <td className="mono" title={address.address}>
                    {shorten(address.address)}
                  </td>
                  <td>{address.status}</td>
                  <td>{(address.balanceCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="split">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Gas top-ups</div>
          {(overview?.gasTopUps?.length ?? 0) === 0 ? (
            <div className="muted">No gas top-ups yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Tx hash</th>
                </tr>
              </thead>
              <tbody>
                {overview?.gasTopUps.map((item) => (
                  <tr key={item.txHash}>
                    <td>{item.invoiceId}</td>
                    <td style={{ fontWeight: 600 }}>{item.nativeAmount > 0 ? (item.nativeAmount / 1e18).toString() + " ETH" : "0 ETH"}</td>
                    <td className="mono" title={item.fromAddress}>{shorten(item.fromAddress)}</td>
                    <td className="mono" title={item.toAddress}>{shorten(item.toAddress)}</td>
                    <td className="mono" title={item.txHash}>{shorten(item.txHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Sweeps to hot wallet</div>
          {(overview?.sweepSummary?.length ?? 0) === 0 ? (
            <div className="muted">No sweeps yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Tx hash</th>
                </tr>
              </thead>
              <tbody>
                {overview?.sweepSummary.map((item) => (
                  <tr key={item.txHash}>
                    <td>{item.invoiceId}</td>
                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>{(item.amountCents / 100).toFixed(2)} USDT</td>
                    <td className="mono" title={item.fromAddress}>{shorten(item.fromAddress)}</td>
                    <td className="mono" title={item.toAddress}>{shorten(item.toAddress)}</td>
                    <td className="mono" title={item.txHash}>{shorten(item.txHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
