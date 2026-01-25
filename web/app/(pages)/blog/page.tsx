'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ArrowRight,
  Clock,
  Search,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { blogPosts } from '@/lib/blog-data'
import * as Icons from 'lucide-react'

// Get unique categories from blog posts
const categories = ['All', ...Array.from(new Set(blogPosts.map(post => post.category)))]

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const }
  }
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter posts based on category and search
  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
      const matchesSearch = searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  // Get featured posts
  const featuredPosts = filteredPosts.filter(post => post.featured)
  const regularPosts = filteredPosts.filter(post => !post.featured)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Blog & Resources</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
              Insights for{' '}
            </span>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Builders
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Deep dives into AI agents, web grounding, structured data extraction, and building intelligent machines.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 border-b border-border/50 sticky top-[73px] z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {categories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <p className="text-sm text-muted-foreground">
          Showing {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Featured Posts */}
      <AnimatePresence mode="wait">
        {featuredPosts.length > 0 && (
          <motion.section
            key="featured"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-12"
          >
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center gap-2 mb-8">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Featured Articles</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {featuredPosts.map((post, index) => {
                  const IconComponent = post.iconName ? (Icons as any)[post.iconName] : BookOpen
                  return (
                    <motion.div
                      key={post.slug}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group block h-full bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border/50 rounded-3xl overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
                      >
                        <div className="p-8">
                          <div className="flex items-start justify-between gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl ${post.color || 'bg-gradient-to-br from-primary/20 to-secondary/20'} flex items-center justify-center`}>
                              <IconComponent className="w-7 h-7 text-primary" />
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                              Featured
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-accent/10 text-accent-foreground text-xs font-semibold rounded-full border border-accent/20">
                              {post.category}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.readTime}
                            </span>
                          </div>

                          <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
                            {post.title}
                          </h3>

                          <p className="text-muted-foreground line-clamp-2 leading-relaxed mb-6">
                            {post.excerpt}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                              Read Article <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Blog Posts Grid */}
      <section className="py-12 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {regularPosts.length > 0 && (
            <>
              <h2 className="text-2xl font-bold mb-8">
                {featuredPosts.length > 0 ? 'Latest Articles' : 'All Articles'}
              </h2>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {regularPosts.map((post) => {
                  const IconComponent = post.iconName ? (Icons as any)[post.iconName] : BookOpen

                  return (
                    <motion.div key={post.slug} variants={cardVariants}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group flex flex-col h-full bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
                      >
                        <div className={`h-44 ${post.color || 'bg-gradient-to-br from-primary/10 to-secondary/10'} flex items-center justify-center relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <IconComponent className="w-8 h-8 text-primary" />
                            </div>
                          </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="px-2.5 py-1 bg-accent/10 text-accent-foreground text-xs font-semibold rounded-full border border-accent/20">
                              {post.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <Clock className="w-3 h-3" />
                              {post.readTime}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {post.title}
                          </h3>

                          <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1 leading-relaxed">
                            {post.excerpt}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                              Read <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            </>
          )}

          {/* Empty State */}
          {filteredPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filter to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All')
                  setSearchQuery('')
                }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Newsletter</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Get the latest guides on AI agents, deep research, and machine learning delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full sm:flex-1 px-5 py-4 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam, unsubscribe anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
              <span className="font-bold text-lg">UnforgeAPI</span>
            </Link>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
            </div>

            <div className="flex gap-6">
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
