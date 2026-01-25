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
  metadataBase: new URL('https://www.unforgeapi.com'),
  title: {
    default: "UnforgeAPI - Deep Research API for Machines & AI Agents",
    template: "%s | UnforgeAPI"
  },
  description: "UnforgeAPI provides Deep Research API built for machines and AI agents. Real-time web grounding, 30-40 second deep analysis, and perfectly structured JSON output.",
  keywords: [
    "Deep Research API",
    "AI agent API",
    "LLM API",
    "machine learning API",
    "AI research API",
    "structured data extraction",
    "web grounding",
    "AI agent tools",
    "enterprise AI",
    "grounded AI",
    "citation mode",
    "JSON schema API",
    "AI chatbot API",
    "Groq API",
    "Tavily API",
    "AI automation"
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
    url: "https://www.unforgeapi.com",
    siteName: "UnforgeAPI",
    title: "UnforgeAPI - Deep Research API for Machines & AI Agents",
    description: "Deep Research API built for machines and AI agents. Real-time web grounding, 30-40 second deep analysis, and perfectly structured JSON output.",
    images: [
      {
        url: "/landingpage.png",
        width: 1200,
        height: 630,
        alt: "UnforgeAPI - Deep Research API for Machines & AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UnforgeAPI - Deep Research API for Machines & AI Agents",
    description: "Deep Research API built for machines and AI agents. Real-time web grounding and structured JSON output.",
    images: ["/landingpage.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://www.unforgeapi.com",
  },
};

// JSON-LD Structured Data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UnforgeAPI',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: 'Deep Research API built for machines and AI agents. Real-time web grounding, 30-40 second deep analysis, and perfectly structured JSON output.',
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
    'Deep Research API for machines',
    'Real-time web grounding',
    '30-40 second deep analysis',
    'Structured JSON output',
    'Custom schema support',
    'BYOK support',
    'AI agent integration',
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
