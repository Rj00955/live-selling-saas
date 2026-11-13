import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiako Live | Tableau de bord",
  description: "Plateforme d'automatisation de la vente sociale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
  lang="fr"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
