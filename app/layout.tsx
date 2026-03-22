import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tallow Be Thy Soap Lab | Artisan Soap Calculator",
  description:
    "Formulate handcrafted soap recipes with precision using the Tallow Be Thy Soap Lab. Built for artisan soapmakers who care about quality, control, and tradition.",
  openGraph: {
    title: "Tallow Be Thy Soap Lab",
    description: "Artisan Soap Calculator for handcrafted soapmakers",
    url: "https://calc.tallowbethysoap.com",
    siteName: "Tallow Be Thy Soap",
    images: [
      {
        url: "https://calc.tallowbethysoap.com/tbts-soap-lab-og-preview.png",
        width: 1200,
        height: 630,
        alt: "Tallow Be Thy Soap Lab Artisan Soap Calculator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tallow Be Thy Soap Lab",
    description: "Artisan Soap Calculator for handcrafted soapmakers",
    images: ["https://calc.tallowbethysoap.com/tbts-soap-lab-og-preview.png"],
  },
  metadataBase: new URL("https://calc.tallowbethysoap.com"),
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
