import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LeafSearch - AI-Powered Learning Assistant | LeafLearning',
  description: 'Ask anything and get AI-powered answers with citations from the web. Create study sets, flashcards, and quizzes instantly.',
}

export default function OverviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
