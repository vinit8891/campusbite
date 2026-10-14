import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { appConfig } from "@/config/app";
import AppProviders from "@/providers/AppProviders";
import Footer from "@/components/layout/Footer";
import { LiveOrderTrackerBar } from "@/components/orders/LiveOrderTrackerBar";
import { LocationPickerModal } from "@/components/location/LocationPickerModal";
import { FloatingWhatsAppButton } from "@/components/common/FloatingWhatsAppButton";

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

          {/* Location Selector Bottom Sheet Modal */}
          <LocationPickerModal />

          {/* Floating WhatsApp Help Button */}
          <FloatingWhatsAppButton />

          <Toaster
            position="top-center"
            duration={2500}
            toastOptions={{
              className:
                "!rounded-full !bg-zinc-900/95 !text-zinc-100 !backdrop-blur-md !border !border-zinc-800 !shadow-2xl !px-4 !py-2.5 !text-sm !font-medium",
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}