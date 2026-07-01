import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LP45 Private Investment Club",
  description: "Private investment club management platform",
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