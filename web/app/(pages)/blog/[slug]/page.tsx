'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, notFound } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, User, Check, Copy, Twitter, Linkedin, Share2, Tag, ArrowRight } from 'lucide-react'
import { blogPosts } from '@/lib/blog-data'
import * as Icons from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const [copied, setCopied] = useState(false)

  const post = blogPosts.find(p => p.slug === slug)
  
  if (!post) {
    notFound()
  }

  // Get dynamic icon if available
  const IconComponent = post.iconName ? (Icons as any)[post.iconName] : null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const relatedPosts = blogPosts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/blog"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Blog</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      <div className="relative pt-12 pb-12 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <article className="relative max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            
            {/* Post Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full border border-accent/20 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {post.category}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-foreground">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Author & Share */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-8 border-y border-border mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{post.author}</p>
                  {post.authorRole && (
                    <p className="text-sm text-muted-foreground">{post.authorRole}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2 font-medium">Share:</span>
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 hover:text-accent transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Featured Image or Icon */}
            <div className="mb-12 rounded-2xl overflow-hidden bg-muted/30 border border-border">
              {post.image ? (
                // In a real app, use the actual image. For now using a placeholder div with the image path as a comment
                <div className="aspect-video w-full bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                        {/* Placeholder for {post.image} */}
                        <ImageIcon className="w-24 h-24" />
                    </div>
                </div>
              ) : (
                 <div className={`aspect-video w-full ${post.color || 'bg-gradient-to-br from-primary/10 to-secondary/10'} flex items-center justify-center`}>
                    {IconComponent ? (
                        <IconComponent className="w-32 h-32 text-primary/20" />
                    ) : (
                        <BookOpen className="w-32 h-32 text-primary/20" />
                    )}
                 </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({node, ...props}) => <h2 className="text-3xl font-bold mt-12 mb-6" {...props} />,
                    h2: ({node, ...props}) => <h3 className="text-2xl font-bold mt-10 mb-5" {...props} />,
                    h3: ({node, ...props}) => <h4 className="text-xl font-bold mt-8 mb-4" {...props} />,
                    table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-8 border border-border rounded-lg">
                            <table className="w-full text-left border-collapse" {...props} />
                        </div>
                    ),
                    th: ({node, ...props}) => <th className="bg-muted/50 p-4 border-b border-border font-semibold text-foreground" {...props} />,
                    td: ({node, ...props}) => <td className="p-4 border-b border-border/50 text-muted-foreground" {...props} />,
                    a: ({node, ...props}) => <a className="text-accent hover:underline font-medium" {...props} />,
                    blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-accent pl-6 italic text-muted-foreground my-8 bg-accent/5 py-4 pr-4 rounded-r-lg" {...props} />
                    )
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        </article>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-muted/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => {
                const RelatedIcon = relatedPost.iconName ? (Icons as any)[relatedPost.iconName] : BookOpen
                return (
                  <Link 
                    key={relatedPost.slug} 
                    href={`/blog/${relatedPost.slug}`}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-accent/50 transition-all"
                  >
                    <div className={`h-32 ${relatedPost.color || 'bg-gradient-to-br from-primary/5 to-secondary/5'} flex items-center justify-center`}>
                      <RelatedIcon className="w-12 h-12 text-primary/20 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="p-5">
                      <span className="inline-block px-2 py-0.5 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20 mb-3">
                        {relatedPost.category}
                      </span>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-medium text-accent mt-4 group-hover:gap-2 transition-all">
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
      <section className="py-20 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build with AI?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join developers using UnforgeAPI to ship intelligent applications faster with our Hybrid RAG engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Get API Key Free
            </Link>
            <Link href="/docs" className="inline-flex px-8 py-4 bg-muted text-foreground border border-border rounded-xl font-bold hover:bg-muted/80 transition-colors">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/10">
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
    </div>
  )
}

function BookOpen(props: any) {
    return <Icons.BookOpen {...props} />
}

function ImageIcon(props: any) {
    return <Icons.Image {...props} />
}
