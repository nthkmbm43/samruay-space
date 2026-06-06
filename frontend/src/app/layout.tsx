import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from 'react-hot-toast';
import { siteConfig } from "@/config/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  keywords: ["หอพัก", "ระบบจัดการหอพัก", "dormitory management", "room booking"],
  authors: [{ name: "SAMRUAY SPACE" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'var(--card)',
                  color: 'var(--card-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                },
                success: {
                  iconTheme: { primary: '#10B981', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#F43F5E', secondary: '#fff' },
                },
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
