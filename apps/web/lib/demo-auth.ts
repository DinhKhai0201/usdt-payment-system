"use client";

export type DemoRole = "customer" | "merchant" | "admin";

export type DemoSession = {
  role: DemoRole;
  address: string;
  name: string;
  connectedAt: string;
};

const SESSION_KEY = "payflow-demo-session";

export async function setRole(role: DemoRole, address: string) {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection is only available in the browser.");
  }

  const session: DemoSession = {
    role,
    address,
    name: role === "customer" ? "Customer Wallet" : role === "merchant" ? "Merchant Operator" : "Admin Operator",
    connectedAt: new Date().toISOString()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
}
