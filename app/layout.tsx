import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const siteUrl = "https://calc.tallowbethysoap.com";
const socialImageUrl = `${siteUrl}/tbts-soap-lab-og-preview.png`;

export const metadata: Metadata = {
  title: "Tallow Be Thy Soap Lab",
  description: "Artisan Soap Calculator for handcrafted soapmakers",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Tallow Be Thy Soap Lab",
    description: "Artisan Soap Calculator for handcrafted soapmakers",
    url: siteUrl,
    siteName: "Tallow Be Thy Soap Lab",
    type: "website",
    images: [
      {
        url: socialImageUrl,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tallow Be Thy Soap Lab",
    description: "Artisan Soap Calculator for handcrafted soapmakers",
    images: [socialImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
