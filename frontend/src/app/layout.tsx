import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../styles/accessibility.css";
import AppClerkProvider from "@/lib/clerk";
import { getFaviconMetadata } from "@/lib/icons";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Fix My Barangay",
  description: "Report civic issues in your barangay community",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fix My Barangay",
  },
  icons: getFaviconMetadata(),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
  {/* Removed deprecated apple-mobile-web-app-capable meta (handled by metadata.appleWebApp) */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fix My Barangay" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppClerkProvider>
          {children}
        </AppClerkProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    }, function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
