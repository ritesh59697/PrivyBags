// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { WalletProvider } from "@/providers/WalletProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { Navbar } from "@/components/layout/Navbar";

import { SplashProvider } from "@/providers/SplashProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PrivyBag — Private Tips for Bags Creators",
  description:
    "Send shielded tips on Bags.fm. Your wallet, amount, and identity " +
    "stay hidden using ZK Compression on Solana.",
  openGraph: {
    title: "PrivyBag",
    description: "Privacy-first tipping for Bags creators",
  },
  icons: {
    icon: "/plogo.png",
    shortcut: "/plogo.png",
    apple: "/plogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} bg-gray-950 text-white antialiased`}>
        <WalletProvider>
          <NotificationProvider>
            <SplashProvider>
              <Navbar />
              <main className="min-h-screen">{children}</main>
            </SplashProvider>
          </NotificationProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
