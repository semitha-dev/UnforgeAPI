import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackButton from "./components/FeedbackButton";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://leaflearning.live'),
  title: {
    default: "LeafLearning - AI-Powered Study Companion | Flashcards, Quizzes & Summaries",
    template: "%s | LeafLearning"
  },
  description: "Transform your learning with LeafLearning's AI-powered study tools. Generate flashcards, quizzes, summaries from PDFs & notes. Smart study schedules & progress tracking. Start free!",
  keywords: [
    "AI study app",
    "AI flashcard generator",
    "AI quiz maker",
    "study companion",
    "PDF summarizer",
    "smart study planner",
    "AI learning assistant",
    "flashcard app",
    "quiz generator",
    "study schedule",
    "note summarizer",
    "AI education",
    "student tools",
    "exam preparation",
    "study productivity"
  ],
  authors: [{ name: "LeafLearning" }],
  creator: "LeafLearning",
  publisher: "LeafLearning",
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
    url: "https://leaflearning.live",
    siteName: "LeafLearning",
    title: "LeafLearning - AI-Powered Study Companion",
    description: "Transform your learning with AI. Generate flashcards, quizzes, and summaries from your notes and PDFs. Smart study schedules included!",
    images: [
      {
        url: "/landingpage.png",
        width: 1200,
        height: 630,
        alt: "LeafLearning - AI Study Companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeafLearning - AI-Powered Study Companion",
    description: "Transform your learning with AI. Generate flashcards, quizzes, and summaries instantly!",
    images: ["/landingpage.png"],
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual code from Google Search Console
  },
  alternates: {
    canonical: "https://leaflearning.live",
  },
};

// JSON-LD Structured Data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LeafLearning',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description: 'AI-powered study companion that generates flashcards, quizzes, and summaries from your notes and PDFs.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with 500 tokens included',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
  featureList: [
    'AI-powered flashcard generation',
    'Smart quiz creation',
    'PDF and note summarization',
    'Personalized study schedules',
    'Progress tracking and analytics',
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
        {children}
        <FeedbackButton />
        <Analytics />
      </body>
    </html>
  );
}
