import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ClientLayout } from "@/lib/i18n/ClientLayout";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

export const metadata: Metadata = {
  title: {
    default: "IGMaster — IGCSE Revision & Past Papers for CAIE & Edexcel",
    template: "%s | IGMaster",
  },
  description:
    "Free IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel (Cambridge & Pearson). Practice with marking schemes and ace your IGCSE exams.",
  keywords: [
    "IGCSE",
    "IGCSE past papers",
    "IGCSE revision",
    "IGCSE notes",
    "CAIE past papers",
    "Edexcel IGCSE",
    "Cambridge IGCSE",
    "IGCSE mock exams",
    "IGCSE topic questions",
    "IGCSE biology",
    "IGCSE chemistry",
    "IGCSE physics",
    "IGCSE mathematics",
    "IGCSE economics",
    "IGCSE computer science",
    "IGCSE 0580",
    "IGCSE 0625",
    "IGCSE 0620",
    "IGCSE 0610",
    "IGCSE 0455",
    "IGCSE 0478",
    "exam preparation",
    "IGCSE study",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "IGMaster — IGCSE Revision & Past Papers for CAIE & Edexcel",
    description:
      "Free IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel. Practice with marking schemes to improve your grades.",
    url: "https://igmaster.org",
    siteName: "IGMaster",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IGMaster — IGCSE Revision",
    description:
      "Free IGCSE past papers, topic questions, and revision notes for CAIE & Edexcel.",
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
        <link rel="alternate" hrefLang="en" href="https://igmaster.org" />
        <link rel="alternate" hrefLang="zh" href="https://igmaster.org" />
        <link rel="alternate" hrefLang="x-default" href="https://igmaster.org" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "IGMaster",
              url: "https://igmaster.org",
              description: "Free IGCSE past papers, topic questions, revision notes, and mock exams for CAIE and Edexcel. Practice with marking schemes.",
              inLanguage: ["en", "zh"],
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://igmaster.org/subjects?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOccupationalProgram",
              name: "IGCSE Revision Platform",
              description: "Online revision platform for IGCSE students covering CAIE and Edexcel subjects with topic questions, notes, past papers, and mock exams.",
              provider: {
                "@type": "Organization",
                name: "IGMaster",
                url: "https://igmaster.org",
              },
              educationalCredentialAwarded: "IGCSE",
            }),
          }}
        />
      </head>
      <body className="bg-white text-[#1E293B] antialiased font-poppins">
        <ClientLayout>{children}</ClientLayout>
        <AnalyticsTracker />
      </body>
    </html>
  );
}

