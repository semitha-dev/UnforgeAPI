'use client'

import Link from 'next/link'
import { ArrowLeft, Leaf, BookOpen, Calendar, ArrowRight, Clock, User } from 'lucide-react'

const blogPosts = [
  {
    id: 1,
    title: 'How AI is Revolutionizing Study Habits in 2025',
    excerpt: 'Discover how artificial intelligence is transforming the way students prepare for exams and retain information more effectively.',
    category: 'AI & Education',
    date: 'Dec 20, 2025',
    readTime: '5 min read',
    image: '🤖'
  },
  {
    id: 2,
    title: '10 Study Techniques Backed by Science',
    excerpt: 'Learn about evidence-based study methods that can help you learn faster and remember longer, from spaced repetition to active recall.',
    category: 'Study Tips',
    date: 'Dec 15, 2025',
    readTime: '8 min read',
    image: '🧠'
  },
  {
    id: 3,
    title: 'Why Flashcards Still Work (And How to Make Better Ones)',
    excerpt: 'The humble flashcard remains one of the most effective study tools. Here\'s how to maximize their potential with AI assistance.',
    category: 'Study Tips',
    date: 'Dec 10, 2025',
    readTime: '6 min read',
    image: '📚'
  },
  {
    id: 4,
    title: 'Managing Exam Stress: A Student\'s Guide',
    excerpt: 'Practical tips for handling exam anxiety and performing your best when it matters most.',
    category: 'Wellness',
    date: 'Dec 5, 2025',
    readTime: '7 min read',
    image: '🧘'
  },
  {
    id: 5,
    title: 'LeafLearning Product Update: December 2025',
    excerpt: 'Check out all the new features we\'ve added this month, including improved AI summarization and mobile sharing.',
    category: 'Product Updates',
    date: 'Dec 1, 2025',
    readTime: '4 min read',
    image: '🚀'
  },
  {
    id: 6,
    title: 'The Science of Spaced Repetition',
    excerpt: 'Understanding the forgetting curve and how strategic review timing can dramatically improve long-term retention.',
    category: 'Study Tips',
    date: 'Nov 25, 2025',
    readTime: '9 min read',
    image: '📈'
  }
]

const categories = ['All', 'AI & Education', 'Study Tips', 'Wellness', 'Product Updates']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium font-body">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold font-headline text-text-primary">LeafLearning</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
            Learn Smarter, Study Better
          </h1>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Tips, insights, and updates from the LeafLearning team to help you maximize your learning potential.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded-full text-sm font-medium font-cta transition-colors ${
                  index === 0 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted text-text-secondary hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article key={post.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-card transition-shadow group">
                <div className="h-48 bg-gradient-to-br from-accent/10 to-secondary/10 flex items-center justify-center">
                  <span className="text-6xl">{post.image}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold font-cta rounded-full">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-headline text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-text-secondary font-body mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                      Read More <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-gradient-to-br from-accent/10 to-secondary/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold font-headline text-primary mb-4">Stay Updated</h2>
          <p className="text-text-secondary font-body mb-6 max-w-xl mx-auto">
            Get the latest study tips, product updates, and educational insights delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-border bg-card text-text-primary font-body focus:outline-none focus:border-accent"
            />
            <button className="w-full sm:w-auto px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary font-body">
            © {new Date().getFullYear()} LeafLearning. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
