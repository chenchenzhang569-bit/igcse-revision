// force-redeploy: 2026-05-28 fix CM
import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Master IGCSE — Achieve More",
  description: "Your ultimate destination for CAIE and Edexcel IGCSE preparation. Past papers, revision notes, and topic questions.",
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
      </head>
      <body className="bg-white text-[#1E293B] antialiased font-poppins">
        {children}
      </body>
    </html>
  );
}

