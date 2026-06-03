"use client";

import { ShoppingBag, Store, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { SYSTEM_WALLETS, SystemWallet, setWalletSession, readSession } from "../lib/demo-wallet";
import { useRouter } from "next/navigation";

export function HomeClient() {
  const router = useRouter();

  useEffect(() => {
    const currentSession = readSession();
    if (currentSession) {
      if (currentSession.role === "customer") {
        router.push("/store");
      } else if (currentSession.role === "merchant") {
        router.push("/merchant-portal");
      } else if (currentSession.role === "admin") {
        router.push("/admin");
      }
    }
  }, [router]);

  function handleLogin(wallet: SystemWallet) {
    setWalletSession(wallet);
    if (wallet.role === "customer") {
      window.location.href = "/store";
    } else {
      window.location.href = "/merchant-portal";
    }
  }

  const [balances, setBalances] = useState<Record<string, { eth: string; usdt: string }>>({});

  useEffect(() => {
    let isMounted = true;
    import("ethers").then(({ ethers }) => {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const MockUSDTAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const contract = new ethers.Contract(MockUSDTAddress, ["function balanceOf(address) view returns (uint256)"], provider);
      
      const fetchAllBalances = async () => {
        const newBalances: Record<string, { eth: string; usdt: string }> = {};
        for (const wallet of SYSTEM_WALLETS) {
          try {
            const eth = await provider.getBalance(wallet.address);
            const usdt = await contract.balanceOf(wallet.address);
            newBalances[wallet.address] = {
              eth: (Number(eth) / 1e18).toFixed(4),
              usdt: (Number(usdt) / 1e6).toFixed(2),
            };
          } catch (e) {
            console.error("Failed to fetch balance for", wallet.address);
          }
        }
        if (isMounted) setBalances(newBalances);
      };

      fetchAllBalances();
    });
    return () => { isMounted = false; };
  }, []);

  const customers = SYSTEM_WALLETS.filter((w) => w.role === "customer");
  const merchants = SYSTEM_WALLETS.filter((w) => w.role === "merchant");

  return (
    <>
      <section>
        <h1 className="page-title">Demo Wallet Selection</h1>
        <p className="page-subtitle">
          Select a pre-funded Anvil system wallet below to enter the demo as either a Customer or a Merchant.
          No MetaMask required.
        </p>
      </section>

      <section className="actor-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 40 }}>
        <div className="actor-card">
          <div className="actor-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ShoppingBag size={20} color="var(--green-deep)" />
            Customer Wallets
          </div>
          <p className="muted" style={{ marginBottom: 20 }}>
            Enter the merchant storefront, place an order, then pay instantly using these pre-funded wallets.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {customers.map((wallet) => (
              <div 
                key={wallet.address} 
                className="card" 
                style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", transition: "border-color 0.2s" }}
                onClick={() => handleLogin(wallet)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Customer {wallet.index}</div>
                  <div className="mono muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </div>
                  {balances[wallet.address] && (
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>{balances[wallet.address].usdt} USDT</span>
                      <span className="muted">{balances[wallet.address].eth} ETH</span>
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="actor-card">
          <div className="actor-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Store size={20} color="var(--green-deep)" />
            System Admin
          </div>
          <p className="muted" style={{ marginBottom: 20 }}>
            Log into the Merchant Portal to view all incoming orders, sweep funds to hot wallets, and manage deposit addresses.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {merchants.map((wallet) => (
              <div 
                key={wallet.address} 
                className="card" 
                style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", transition: "border-color 0.2s" }}
                onClick={() => handleLogin(wallet)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Merchant Admin</div>
                  <div className="mono muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </div>
                  {balances[wallet.address] && (
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>{balances[wallet.address].usdt} USDT</span>
                      <span className="muted">{balances[wallet.address].eth} ETH</span>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                  Login
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
