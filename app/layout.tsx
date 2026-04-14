import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import { GlobalFilterProvider } from "@/components/GlobalFilterProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
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
    "Comprehensive business income and expense tracker for BizzGrow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <GlobalFilterProvider>
              {children}
            </GlobalFilterProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
