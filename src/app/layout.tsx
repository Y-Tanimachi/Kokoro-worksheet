import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kokoro Worksheet",
  description: "自分の感情を整理するワークシート",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        {/* AuthProvider を最上位に配置し、全ページで useAuth() が使えるようにする */}
        <AuthProvider>
          <Header />
          <main>{children}</main>
          {/* Vercel Analytics: ページビューを自動計測 */}
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
