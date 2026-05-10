import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGCSE Revision — Master Your Exams",
  description: "Comprehensive IGCSE revision for CAIE & Edexcel — past papers, topic questions, notes, and mock exams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
