import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGCSE Revision - 精准备考",
  description: "CAIE & Edexcel IGCSE 复习平台，覆盖全部科目",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
