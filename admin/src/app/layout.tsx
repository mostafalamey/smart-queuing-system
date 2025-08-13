import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { ClientErrorBoundary } from "../components/ClientErrorBoundary";
import { ToastProvider } from "../contexts/ToastContext";
import ToastContainer from "../components/ToastContainer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Smart Queue Admin",
  description: "Admin dashboard for Smart Queue Management System",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Add client-side error handling for chunk loading */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (
                  e.message.includes('Loading chunk') || 
                  e.message.includes('ChunkLoadError') ||
                  e.message.includes('Loading CSS chunk')
                )) {
                  window.location.reload();
                }
              });
              
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && (
                  e.reason.message.includes('Loading chunk') || 
                  e.reason.message.includes('ChunkLoadError')
                )) {
                  window.location.reload();
                }
              });
            `,
          }}
        />
        <AuthProvider>
          <ToastProvider>
            <ClientErrorBoundary>
              {children}
            </ClientErrorBoundary>
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
