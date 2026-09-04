import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { appConfig } from "@/config/app";
import AppProviders from "@/providers/AppProviders";
import Footer from "@/components/layout/Footer";
import { LiveOrderTrackerBar } from "@/components/orders/LiveOrderTrackerBar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>
          {children}

          <Footer />

          {/* Floating Live Activity Order Tracker */}
          <LiveOrderTrackerBar />

          <Toaster
            position="bottom-right"
            richColors
            closeButton
            duration={3000}
          />
        </AppProviders>
      </body>
    </html>
  );
}