"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, ShieldCheck, ShoppingBag, Store, Workflow } from "lucide-react";
import { clearSession, DemoSession, readSession } from "../lib/demo-wallet";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<DemoSession | null>(null);

  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [usdtBalance, setUsdtBalance] = useState<string>("0");

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (!session?.address) return;
    let isMounted = true;
    
    // Import dynamically or ensure ethers is available
    import("ethers").then(({ ethers }) => {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const MockUSDTAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const contract = new ethers.Contract(MockUSDTAddress, ["function balanceOf(address) view returns (uint256)"], provider);
      
      const fetchBalances = async () => {
        try {
          const eth = await provider.getBalance(session.address);
          const usdt = await contract.balanceOf(session.address);
          if (isMounted) {
            setNativeBalance((Number(eth) / 1e18).toFixed(4));
            setUsdtBalance((Number(usdt) / 1e6).toFixed(2));
          }
        } catch (err) {
          console.error("Failed to fetch balances", err);
        }
      };

      fetchBalances();
      const interval = setInterval(fetchBalances, 5000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    });
  }, [session?.address]);

  let activeItems = [{ href: "/", label: "Role Selection", icon: Workflow }];

  if (session?.role === "customer") {
    activeItems.push({ href: "/store", label: "Storefront", icon: ShoppingBag });
  } else if (session?.role === "merchant") {
    activeItems.push({ href: "/merchant-portal", label: "Merchant Portal", icon: Store });
    activeItems.push({ href: "/admin", label: "Wallet Admin", icon: ShieldCheck });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          PayFlow USDT
        </div>

        <nav className="nav-list">
          {activeItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        <div className="page-header" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          {session && (
            <div className="card" style={{ padding: "8px 16px", display: "flex", gap: 24, alignItems: "center", background: "white" }}>
              <div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>Connected role</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{session.name}</div>
                <div className="mono muted" style={{ fontSize: "0.8rem" }}>{session.address}</div>
              </div>
              <div style={{ display: "flex", gap: 16, borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                <div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>USDT Balance</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--primary)" }}>{usdtBalance} USDT</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>Native Balance</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{nativeBalance} ETH</div>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                onClick={() => {
                  clearSession();
                  window.location.href = "/";
                }}
              >
                Switch role
              </button>
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
