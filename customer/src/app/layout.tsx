import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import DynamicManifest from "@/components/DynamicManifest";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Smart Queue Customer",
  description: "Join the queue digitally",
  // manifest: removed - handled dynamically by DynamicManifest component
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Smart Queue Customer",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3b82f6",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <DynamicManifest />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
