import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PayFlow USDT",
  description: "Local-first USDT payment flow demo built with Next.js and NestJS."
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

