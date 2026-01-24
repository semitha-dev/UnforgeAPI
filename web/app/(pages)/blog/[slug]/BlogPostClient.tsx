'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Check,
  Copy,
  Twitter,
  Linkedin,
  Tag,
  ArrowRight,
  ChevronUp,
  BookOpen,
  Share2,
  Hash
} from 'lucide-react'
import { blogPosts, BlogPost } from '@/lib/blog-data'
import * as Icons from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Helper to extract headings from markdown content
function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const headings: { id: string; text: string; level: number }[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2]
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    headings.push({ id, text, level })
  }

  return headings
}

interface BlogPostClientProps {
  post: BlogPost
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Scroll progress
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Extract table of contents
  const tableOfContents = useMemo(() => {
    return extractHeadings(post.content)
  }, [post.content])

  // Track scroll position for active section and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)

      // Find the current active section
      const headingElements = tableOfContents.map(h =>
        document.getElementById(h.id)
      ).filter(Boolean)

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i]
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 100) {
            setActiveSection(tableOfContents[i].id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [tableOfContents])

  // Get dynamic icon if available
  const IconComponent = post.iconName ? (Icons as any)[post.iconName] : BookOpen

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const relatedPosts = blogPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-[60] origin-left"
        style={{ scaleX }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Blog</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      <div className="relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <div className="flex gap-12">
            {/* Table of Contents - Desktop */}
            <aside className="hidden xl:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <div className="p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Table of Contents
                  </h4>
                  <nav className="space-y-2">
                    {tableOfContents.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`block text-sm transition-all duration-200 ${
                          activeSection === heading.id
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Share Section */}
                <div className="mt-6 p-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" />
                    Share Article
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center gap-2"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-muted/50 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-muted/50 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <article className="flex-1 min-w-0 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Post Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full border border-primary/20 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {post.readTime}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-foreground">
                  {post.title}
                </h1>

                {/* Excerpt */}
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Author & Share (Mobile) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-6 border-y border-border/50 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{post.author}</p>
                      {post.authorRole && (
                        <p className="text-sm text-muted-foreground">{post.authorRole}</p>
                      )}
                    </div>
                  </div>

                  {/* Mobile Share */}
                  <div className="flex items-center gap-2 xl:hidden">
                    <span className="text-sm text-muted-foreground mr-2 font-medium">Share:</span>
                    <button
                      onClick={handleCopyLink}
                      className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      title="Copy link"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-muted/50 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a
                      href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-muted/50 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Featured Image or Icon */}
                <div className="mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
                  <div className={`aspect-[2/1] w-full ${post.color || 'bg-gradient-to-br from-primary/10 to-secondary/10'} flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent)]" />
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                        <IconComponent className="w-12 h-12 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="prose prose-lg prose-slate dark:prose-invert max-w-none
                  prose-headings:scroll-mt-24
                  prose-headings:font-bold
                  prose-headings:text-foreground
                  prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-3
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-li:text-muted-foreground prose-li:marker:text-primary
                  prose-ul:my-6 prose-ol:my-6
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:not-italic
                  prose-img:rounded-xl prose-img:shadow-lg
                ">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, children, ...props}) => {
                        const text = String(children)
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        return <h2 id={id} className="text-3xl font-bold mt-12 mb-6 scroll-mt-24" {...props}>{children}</h2>
                      },
                      h2: ({node, children, ...props}) => {
                        const text = String(children)
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        return <h3 id={id} className="text-2xl font-bold mt-10 mb-5 border-b border-border/50 pb-3 scroll-mt-24" {...props}>{children}</h3>
                      },
                      h3: ({node, children, ...props}) => {
                        const text = String(children)
                        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        return <h4 id={id} className="text-xl font-bold mt-8 mb-4 scroll-mt-24" {...props}>{children}</h4>
                      },
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-8 border border-border/50 rounded-xl">
                          <table className="w-full text-left border-collapse" {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => (
                        <th className="bg-muted/50 p-4 border-b border-border/50 font-semibold text-foreground" {...props} />
                      ),
                      td: ({node, ...props}) => (
                        <td className="p-4 border-b border-border/30 text-muted-foreground" {...props} />
                      ),
                      a: ({node, ...props}) => (
                        <a className="text-primary hover:underline font-medium" {...props} />
                      ),
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-8 bg-primary/5 py-4 pr-4 rounded-r-xl" {...props} />
                      ),
                      pre: ({node, ...props}) => (
                        <pre className="bg-muted/50 border border-border/50 rounded-xl p-4 overflow-x-auto" {...props} />
                      ),
                    }}
                  >
                    {post.content}
                  </ReactMarkdown>
                </div>

                {/* Tags */}
                <div className="mt-12 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                    <span className="px-3 py-1.5 bg-muted/50 text-sm rounded-full hover:bg-muted transition-colors cursor-pointer">
                      {post.category}
                    </span>
                    <span className="px-3 py-1.5 bg-muted/50 text-sm rounded-full hover:bg-muted transition-colors cursor-pointer">
                      AI Agents
                    </span>
                    <span className="px-3 py-1.5 bg-muted/50 text-sm rounded-full hover:bg-muted transition-colors cursor-pointer">
                      Deep Research
                    </span>
                  </div>
                </div>
              </motion.div>
            </article>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-muted/20 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => {
                const RelatedIcon = relatedPost.iconName ? (Icons as any)[relatedPost.iconName] : BookOpen
                return (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className={`h-36 ${relatedPost.color || 'bg-gradient-to-br from-primary/10 to-secondary/10'} flex items-center justify-center relative`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
                      <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <RelatedIcon className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                    <div className="p-6">
                      <span className="inline-block px-2.5 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20 mb-3">
                        {relatedPost.category}
                      </span>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary mt-4 group-hover:gap-2 transition-all">
                        Read More <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-background border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build with AI?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join developers using UnforgeAPI to ship intelligent applications faster with our Hybrid RAG engine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 group"
              >
                Get API Key Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center px-8 py-4 bg-muted text-foreground border border-border rounded-xl font-bold hover:bg-muted/80 transition-colors"
              >
                Read the Docs
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-muted/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
              <span className="font-bold text-lg">UnforgeAPI</span>
            </Link>

            <div className="flex gap-8">
              <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
              <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documentation</Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 p-4 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors z-50"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6" />
      </motion.button>
    </div>
  )
}
