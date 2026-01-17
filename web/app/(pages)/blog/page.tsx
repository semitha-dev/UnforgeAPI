'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BookOpen, Calendar, ArrowRight, Clock, Tag } from 'lucide-react'
import { blogPosts } from '@/lib/blog-data'
import * as Icons from 'lucide-react'

// Get unique categories from blog posts
const categories = ['All', ...Array.from(new Set(blogPosts.map(post => post.category)))]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-accent">Blog</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            UnforgeAPI Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Deep dives into AI agents, web grounding, and building intelligent machines.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  index === 0 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {blogPosts.find(post => post.featured) && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Featured Article</h2>
              {(() => {
                const featuredPost = blogPosts.find(post => post.featured)!
                return (
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="group block bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/50 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="grid md:grid-cols-2 gap-8 p-8">
                      <div className="space-y-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20">
                            <Tag className="w-3 h-3" />
                            {featuredPost.category}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {featuredPost.date}
                          </span>
                        </div>
                        
                        <h3 className="text-3xl font-bold group-hover:text-accent transition-colors leading-tight">
                          {featuredPost.title}
                        </h3>
                        
                        <p className="text-muted-foreground text-lg line-clamp-3 leading-relaxed">
                          {featuredPost.excerpt}
                        </p>
                        
                        <div className="pt-4 flex items-center text-accent font-medium group-hover:translate-x-1 transition-transform">
                          Read Article
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                      
                      <div className="relative h-64 md:h-auto min-h-[300px] bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center overflow-hidden">
                        {featuredPost.image ? (
                           <div className="relative w-full h-full">
                             {/* Placeholder for actual image component if available, using gradient for now */}
                             <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                <BookOpen className="w-16 h-16 text-primary/40" />
                             </div>
                           </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-background/50 flex items-center justify-center backdrop-blur-sm">
                             <BookOpen className="w-10 h-10 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-12 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.filter(post => !post.featured).map((post) => {
              // Dynamically get icon component
              const IconComponent = post.iconName ? (Icons as any)[post.iconName] : BookOpen
              
              return (
                <Link 
                  href={`/blog/${post.slug}`}
                  key={post.slug} 
                  className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-accent/50 transition-all h-full"
                >
                  <div className={`h-48 ${post.color || 'bg-gradient-to-br from-primary/5 to-secondary/5'} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <IconComponent className="w-16 h-16 text-primary/20 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-2.5 py-0.5 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-1 leading-relaxed">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                        Read More <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Get the latest guides on AI agents, deep research, and machine learning delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
            <button className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
              <span className="font-bold text-lg">UnforgeAPI</span>
            </div>
            
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
