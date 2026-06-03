"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { DemoRole, DemoSession } from "../lib/demo-wallet";
import { readSession } from "../lib/demo-wallet";

export function RoleGate({
  role,
  children
}: {
  role: DemoRole;
  children: ReactNode;
}) {
  const [session, setSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  if (!session || session.role !== role) {
    if (role === "admin") {
      return (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Admin Access Required</div>
          <p className="muted">You are trying to access the admin portal. Click below to login as Admin.</p>
          <Link href="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      );
    }

    return (
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Role access required</div>
        <p className="muted">
          This portal is for the <strong>{role}</strong> actor in the demo. Please go back to the home page and
          login with the correct role.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
