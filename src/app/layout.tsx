import type { Metadata } from "next";

import "./globals.css";






export const metadata: Metadata = {
  title: "My Dent AI Dashboard",
  description: "Multi-tenant Retell AI voice agent management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`  antialiased bg-gray-50 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
