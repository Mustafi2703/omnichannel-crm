import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "EA Global Water | Water Treatment CRM",
  description: "EA Global Water customer conversations, pipeline, and AI assistance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${manrope.className} antialiased`}>{children}</body>
    </html>
  );
}
