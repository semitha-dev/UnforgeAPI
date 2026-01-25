import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog - AI Agents, Deep Research & Machine Learning',
  description: 'Explore tutorials, guides, and insights on building AI agents with real-time research capabilities. Learn about web grounding, structured JSON output, and intelligent automation.',
  keywords: [
    'AI agents blog',
    'deep research API',
    'machine learning tutorials',
    'AI automation guides',
    'structured JSON output',
    'web grounding AI',
    'LLM API tutorials',
    'AI agent development',
    'RAG implementation',
    'real-time AI research'
  ],
  openGraph: {
    title: 'UnforgeAPI Blog - Insights for AI Builders',
    description: 'Deep dives into AI agents, web grounding, structured data extraction, and building intelligent machines.',
    type: 'website',
    siteName: 'UnforgeAPI',
    locale: 'en_US',
    images: [
      {
        url: '/landingpage.png',
        width: 1200,
        height: 630,
        alt: 'UnforgeAPI Blog'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnforgeAPI Blog - Insights for AI Builders',
    description: 'Deep dives into AI agents, web grounding, structured data extraction, and building intelligent machines.',
    images: ['/landingpage.png']
  },
  alternates: {
    canonical: 'https://www.unforgeapi.com/blog'
  }
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
