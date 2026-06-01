import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ClientLayout } from "@/lib/i18n/ClientLayout";

export const metadata: Metadata = {
  title: "IGMaster — IGCSE Revision",
  description: "IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className="bg-white text-[#1E293B] antialiased font-poppins">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

