import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard - Mydent",
  description: "Dashboard for managing Mydent AI phone calls and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
       
          <div className="flex h-screen overflow-hidden">
            <div className="h-full">
              <Sidebar />
            </div>
            <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </div>

      </body>
    </html>
  );
}
