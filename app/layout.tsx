
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/contexts/AuthContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RealWorth.ai",
  description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "RealWorth.ai",
    description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "RealWorth.ai Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "RealWorth.ai",
    description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
