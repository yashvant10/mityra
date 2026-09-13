import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents iOS input zoom
  userScalable: false,
  themeColor: "#FAF8F5",
};

export const metadata: Metadata = {
  title: "MITYRA — See it. Try it. Wear it.",
  description:
    "Discover outfits that match your style. Try them on virtually. Shop with confidence. All in one smart experience.",
  keywords: [
    "virtual try-on",
    "fashion shopping",
    "online shopping",
    "outfit discovery",
    "wardrobe management",
    "fashion technology",
    "MITYRA",
  ],
  authors: [{ name: "MITYRA" }],
  openGraph: {
    title: "MITYRA — See it. Try it. Wear it.",
    description:
      "Discover outfits that match your style. Try them on virtually. Shop with confidence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://ui-avatars.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1A1A1A] overflow-x-hidden">
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#FFFFFF",
                  border: "1px solid #E8E0D8",
                  color: "#1A1A1A",
                  borderRadius: "10px",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                },
              }}
            />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
