import type { Metadata } from "next";
import "./globals.css";

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
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="bg-white text-[#1E293B] antialiased font-inter">
        {children}
      </body>
    </html>
  );
}
