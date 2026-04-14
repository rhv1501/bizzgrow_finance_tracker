import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import { GlobalFilterProvider } from "@/components/GlobalFilterProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OfflineProvider } from "@/components/OfflineProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#fbbf24",
};

export const metadata: Metadata = {
  title: "Finance Tracker Pro",
  description: "Comprehensive business income and expense tracker for BizzGrow.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Tracker Pro",
  },
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
              <OfflineProvider>
                {children}
              </OfflineProvider>
            </GlobalFilterProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
