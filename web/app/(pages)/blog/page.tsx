'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight, Clock, Search, Menu, X, Brain, Target, Code, Shield, Server, Database, Zap } from 'lucide-react'

const blogPosts = [
  {
    id: 'understanding-hybrid-rag-architecture',
    title: 'Understanding Hybrid RAG: The Architecture Behind Intelligent AI',
    excerpt: 'Deep dive into Retrieval-Augmented Generation and how UnforgeAPI\'s hybrid approach combines vector search, web research, and LLM reasoning for superior results.',
    category: 'Technical',
    date: 'Jan 2, 2026',
    readTime: '8 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    icon: Brain,
    color: 'from-violet-500/20 to-purple-500/20',
    featured: true
  },
  {
    id: 'enterprise-ai-features-guide',
    title: 'Enterprise AI Features: Building Trust in AI Responses',
    excerpt: 'How strict_mode, grounded_only, and citation_mode help enterprises deploy AI with confidence. A technical guide to UnforgeAPI\'s trust layer.',
    category: 'Enterprise',
    date: 'Jan 1, 2026',
    readTime: '7 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Product',
    icon: Shield,
    color: 'from-emerald-500/20 to-teal-500/20',
    featured: true
  },
  {
    id: 'building-ai-chatbot-tutorial',
    title: 'Build an AI Chatbot in 10 Minutes with UnforgeAPI',
    excerpt: 'A step-by-step tutorial for integrating UnforgeAPI into your application. From API key to production-ready chatbot.',
    category: 'Tutorial',
    date: 'Dec 30, 2025',
    readTime: '10 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Developer Relations',
    icon: Code,
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'managed-vs-byok-comparison',
    title: 'Managed vs BYOK: Choosing the Right UnforgeAPI Plan',
    excerpt: 'A detailed comparison of our Managed and BYOK tiers. Understand the tradeoffs and pick the right plan for your use case.',
    category: 'Product',
    date: 'Dec 28, 2025',
    readTime: '6 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Product',
    icon: Target,
    color: 'from-amber-500/20 to-orange-500/20'
  },
  {
    id: 'router-brain-deep-dive',
    title: 'Inside the Router Brain: How UnforgeAPI Routes Queries',
    excerpt: 'Technical deep-dive into UnforgeAPI\'s intelligent query routing system. Learn how we decide between CHAT, CONTEXT, and RESEARCH paths.',
    category: 'Technical',
    date: 'Dec 25, 2025',
    readTime: '9 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    icon: Server,
    color: 'from-pink-500/20 to-rose-500/20'
  },
  {
    id: 'ai-api-best-practices',
    title: 'Best Practices for Production AI APIs',
    excerpt: 'Lessons learned from serving millions of AI requests. Error handling, rate limiting, caching, and more.',
    category: 'Best Practices',
    date: 'Dec 22, 2025',
    readTime: '8 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    icon: Database,
    color: 'from-indigo-500/20 to-blue-500/20'
  }
]

const categories = ['All', 'Technical', 'Enterprise', 'Tutorial', 'Product', 'Best Practices']

const BlogNavigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-500 overflow-hidden">
              <Image src="/new_logo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-bold text-lg text-gray-900">UnforgeAPI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors">Features</Link>
            <Link href="/#pricing" className="text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors">Pricing</Link>
            <Link href="/docs" className="text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors">Docs</Link>
            <Link href="/blog" className="text-sm font-medium text-violet-600 transition-colors">Blog</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/signin" className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Log In</Link>
            <Link href="/signup" className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-500 rounded-lg hover:bg-violet-600 shadow-lg shadow-violet-200/50 transition-all">Get API Key</Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="flex flex-col p-4 space-y-2">
            <Link href="/#features" className="px-4 py-3 text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg font-medium">Features</Link>
            <Link href="/#pricing" className="px-4 py-3 text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg font-medium">Pricing</Link>
            <Link href="/docs" className="px-4 py-3 text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg font-medium">Docs</Link>
            <Link href="/blog" className="px-4 py-3 text-violet-600 hover:bg-violet-50 rounded-lg font-medium">Blog</Link>
            <hr className="my-2" />
            <Link href="/signin" className="px-4 py-3 text-gray-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg font-medium">Log In</Link>
            <Link href="/signup" className="px-4 py-3 bg-violet-500 text-white text-center font-semibold rounded-lg hover:bg-violet-600">Get API Key</Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  )
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredPosts = blogPosts.filter(post => post.featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <BlogNavigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-primary mb-6">
              UnforgeAPI Blog
            </h1>
            <p className="text-xl text-text-secondary font-body mb-8">
              Technical deep-dives, tutorials, and best practices for building AI-powered applications with UnforgeAPI.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 font-body"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold font-headline text-primary mb-8">Featured Articles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post, index) => {
                const IconComponent = post.icon
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`h-48 bg-gradient-to-br ${post.color} flex items-center justify-center`}>
                      <IconComponent className="w-20 h-20 text-primary/20" />
                    </div>
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold font-cta rounded-full">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-text-secondary">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-headline text-primary mb-3 group-hover:text-accent transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-text-secondary font-body mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Calendar className="w-4 h-4" />
                          {post.date}
                        </div>
                        <Link 
                          href={`/blog/${post.id}`}
                          className="flex items-center gap-1 text-accent font-semibold font-cta group-hover:gap-2 transition-all"
                        >
                          Read More <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold font-cta transition-all ${
                  selectedCategory === category
                    ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20'
                    : 'bg-card border border-border text-text-secondary hover:text-primary hover:border-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold font-headline text-primary mb-8">
            {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
          </h2>
          
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary font-body">No articles found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => {
                const IconComponent = post.icon
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300"
                  >
                    <div className={`h-40 bg-gradient-to-br ${post.color} flex items-center justify-center`}>
                      <IconComponent className="w-16 h-16 text-primary/20" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold font-cta rounded-full">
                          {post.category}
                        </span>
                        <span className="text-xs text-text-secondary">{post.readTime}</span>
                      </div>
                      <h3 className="text-lg font-bold font-headline text-primary mb-2 group-hover:text-accent transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-text-secondary font-body mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{post.date}</span>
                        <Link 
                          href={`/blog/${post.id}`}
                          className="flex items-center gap-1 text-sm text-accent font-semibold font-cta group-hover:gap-2 transition-all"
                        >
                          Read <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-accent/10 to-secondary/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-3xl font-bold font-headline text-primary mb-4">
            Ready to Build with AI?
          </h2>
          <p className="text-text-secondary font-body mb-8 max-w-xl mx-auto">
            Join developers using UnforgeAPI to ship intelligent applications faster with our Hybrid RAG engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup"
              className="inline-flex px-8 py-4 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
            >
              Get API Key Free
            </Link>
            <Link 
              href="/docs"
              className="inline-flex px-8 py-4 bg-white text-primary border border-border rounded-xl font-bold font-cta hover:bg-gray-50 transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
                <Image src="/new_logo.png" alt="UnforgeAPI" width={28} height={28} className="object-contain" />
              </div>
              <span className="text-xl font-bold font-headline">UnforgeAPI</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">Home</Link>
              <Link href="/#features" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">Features</Link>
              <Link href="/#pricing" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">Pricing</Link>
              <Link href="/docs" className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors">Docs</Link>
              <Link href="/blog" className="text-sm text-accent font-body transition-colors">Blog</Link>
            </nav>
            <p className="text-sm text-primary-foreground/60 font-body">
              © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
