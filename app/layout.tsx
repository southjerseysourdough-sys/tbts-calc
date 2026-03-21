import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tallow Be Thy Soap Lab",
  description:
    "A premium client-side soap calculator for artisan cold process soapmaking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
