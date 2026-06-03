import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ClientLayout } from "@/lib/i18n/ClientLayout";
import dynamic from "next/dynamic";

const AnalyticsTracker = dynamic(
  () => import("@/components/AnalyticsTracker"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: {
    default: "IGMaster — IGCSE Revision & Past Papers",
    template: "%s | IGMaster",
  },
  description: "Free IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel. Practice with marking schemes and improve your grades.",
  keywords: ["IGCSE", "past papers", "revision", "CAIE", "Edexcel", "exam preparation", "IGCSE notes"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "IGMaster — IGCSE Revision & Past Papers",
    description: "Free IGCSE past papers, topic questions, revision notes, and mock exams. Practice with marking schemes.",
    url: "https://igmaster.org",
    siteName: "IGMaster",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IGMaster — IGCSE Revision",
    description: "Free IGCSE past papers, topic questions, and revision notes.",
  },
  robots: {
    index: true,
    follow: true,
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
        <AnalyticsTracker />
      </body>
    </html>
  );
}

