import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://unforge.ai'),
  title: {
    default: "UnforgeAPI - Full AI Agent API | Intelligent RAG Router",
    template: "%s | UnforgeAPI"
  },
  description: "UnforgeAPI is a Full AI Agent API with intelligent routing. Save 60-80% on AI costs with our Router Brain technology. Enterprise features: strict_mode, grounded_only, citation_mode.",
  keywords: [
    "AI API",
    "RAG API",
    "AI agent",
    "LLM API",
    "hybrid RAG",
    "intelligent routing",
    "AI cost optimization",
    "enterprise AI",
    "grounded AI",
    "citation mode",
    "jailbreak protection",
    "AI chatbot API",
    "Groq API",
    "Tavily API"
  ],
  authors: [{ name: "UnforgeAPI" }],
  creator: "UnforgeAPI",
  publisher: "UnforgeAPI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://unforge.ai",
    siteName: "UnforgeAPI",
    title: "UnforgeAPI - Full AI Agent API",
    description: "Save 60-80% on AI costs with intelligent routing. Enterprise-ready with strict_mode, grounded_only, and citation_mode.",
    images: [
      {
        url: "/landingpage.png",
        width: 1200,
        height: 630,
        alt: "UnforgeAPI - Full AI Agent API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UnforgeAPI - Full AI Agent API",
    description: "Save 60-80% on AI costs with intelligent routing. Enterprise-ready features included!",
    images: ["/landingpage.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://unforge.ai",
  },
};

// JSON-LD Structured Data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UnforgeAPI',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: 'Full AI Agent API with intelligent routing. Save 60-80% on AI costs with Router Brain technology.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free sandbox tier with 50 requests/day',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '50',
  },
  featureList: [
    'Intelligent query routing',
    'Enterprise features: strict_mode, grounded_only, citation_mode',
    '60-80% cost savings',
    'Sub-100ms latency',
    'Full AI Agent - plug and play',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
