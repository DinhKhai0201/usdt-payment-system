import { ethers } from "ethers";

export type DemoRole = "customer" | "merchant" | "admin";

export type SystemWallet = {
  address: string;
  privateKey: string;
  index: number;
  role: DemoRole;
};

// IMPORTANT: This mnemonic is purely for LOCAL DEMO purposes on Anvil.
// NEVER use this mnemonic or this wallet-in-browser architecture in a real production environment.
const DEMO_MNEMONIC = "test test test test test test test test test test test junk";

function getSystemWallets(): SystemWallet[] {
  const wallets: SystemWallet[] = [];
  // Customers: Accounts 1 to 5 (index 1 to 5)
  for (let i = 1; i <= 5; i++) {
    const child = ethers.HDNodeWallet.fromPhrase(DEMO_MNEMONIC, "", `m/44'/60'/0'/0/${i}`);
    wallets.push({
      address: child.address,
      privateKey: child.privateKey,
      index: i,
      role: "customer"
    });
  }

  // Merchant Admin: Account 6 (index 6)
  const child = ethers.HDNodeWallet.fromPhrase(DEMO_MNEMONIC, "", `m/44'/60'/0'/0/6`);
  wallets.push({
    address: child.address,
    privateKey: child.privateKey,
    index: 6,
    role: "merchant"
  });

  return wallets;
}

export const SYSTEM_WALLETS = getSystemWallets();

const SESSION_KEY = "payflow-demo-session";

export type DemoSession = {
  role: DemoRole;
  address: string;
  privateKey: string;
  name: string;
  connectedAt: string;
};

export function setWalletSession(wallet: SystemWallet) {
  if (typeof window === "undefined") return;

  const session: DemoSession = {
    role: wallet.role,
    address: wallet.address,
    privateKey: wallet.privateKey,
    name: wallet.role === "customer" ? `Customer Wallet ${wallet.index}` : `Merchant Operator ${wallet.index}`,
    connectedAt: new Date().toISOString()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function readSession(): DemoSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
