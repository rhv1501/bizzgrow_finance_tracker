import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { SyncEngine } from "@/components/SyncEngine";
import { GlobalFilterProvider } from "@/components/GlobalFilterProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker Pro",
  description:
    "Comprehensive business income and expense tracker with Google Sheets backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <GlobalFilterProvider>
          <SyncEngine />
          {children}
        </GlobalFilterProvider>
      </body>
    </html>
  );
}
