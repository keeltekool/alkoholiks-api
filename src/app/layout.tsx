import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alkoholiks API — Estonian Drink Prices",
  description:
    "Real-time beer, cider, and energy drink prices from 5 Estonian retail chains. OAuth 2.0, OpenAPI 3.1, TypeScript SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
