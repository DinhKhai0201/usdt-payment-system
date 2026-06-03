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

  useEffect(() => {
    setSession(readSession());
  }, []);

  let activeItems = [{ href: "/", label: "Role Selection", icon: Workflow }];

  if (session?.role === "customer") {
    activeItems.push({ href: "/store", label: "Storefront", icon: ShoppingBag });
  } else if (session?.role === "merchant") {
    activeItems.push({ href: "/merchant-portal", label: "Merchant Portal", icon: Store });
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
            <div className="card" style={{ padding: "8px 16px", display: "flex", gap: 16, alignItems: "center", background: "white" }}>
              <div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>Connected role</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{session.name}</div>
                <div className="mono muted" style={{ fontSize: "0.8rem" }}>{session.address}</div>
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
