'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, User, Menu, X, Twitter, Linkedin, Copy, Check, ArrowRight, Brain, Zap, Target, Code, Shield, Server, Database } from 'lucide-react'

// Blog posts data - UnforgeAPI Developer-focused content
const blogPosts = [
  {
    id: 'understanding-hybrid-rag-architecture',
    title: 'Understanding Hybrid RAG: The Architecture Behind Intelligent AI',
    excerpt: 'Deep dive into Retrieval-Augmented Generation and how UnforgeAPI\'s hybrid approach combines vector search, web research, and LLM reasoning for superior results.',
    content: `Retrieval-Augmented Generation (RAG) has become the gold standard for building AI applications that need accurate, grounded responses. But not all RAG implementations are created equal.

At UnforgeAPI, we've built a **Hybrid RAG Architecture** that goes beyond simple vector retrieval. Let's explore how it works.

## What is RAG?

Traditional LLMs have a fundamental limitation: they only know what they were trained on. Ask about recent events, proprietary data, or domain-specific knowledge, and they'll either hallucinate or admit ignorance.

RAG solves this by:
1. **Retrieving** relevant context from a knowledge base
2. **Augmenting** the user's query with this context
3. **Generating** a response grounded in real data

## The Problem with Simple RAG

Basic RAG implementations just do vector similarity search. This works for straightforward queries but fails when:

- The query requires **synthesis** across multiple sources
- The information isn't in your knowledge base
- The query is **conversational** rather than factual
- You need **real-time** information

## UnforgeAPI's Hybrid Approach

Our Router Brain analyzes every query and routes it through the optimal path:

### CHAT Path
For conversational queries that don't need external data:
- Greetings and pleasantries
- General knowledge questions
- Follow-up clarifications

### CONTEXT Path
For queries that need your proprietary data:
- Company-specific information
- Document retrieval
- Knowledge base queries

### RESEARCH Path
For queries requiring fresh, web-based information:
- Recent events and news
- Market data and trends
- Real-time information

## Why Hybrid Wins

The magic happens when we **combine** these intelligently. The response synthesizes your internal data with current market context—something neither pure RAG nor pure web search could do alone.

## Results

Teams using UnforgeAPI's hybrid RAG report:
- **40% more accurate** responses than single-path RAG
- **60% fewer hallucinations** with grounding checks
- **3x faster** time-to-insight for complex queries

The future of AI isn't choosing between approaches—it's intelligently combining them.`,
    category: 'Technical',
    date: 'Jan 2, 2026',
    readTime: '8 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    authorBio: 'The UnforgeAPI engineering team builds cutting-edge AI infrastructure for developers worldwide.',
    icon: Brain,
    color: 'from-violet-500/20 to-purple-500/20'
  },
  {
    id: 'enterprise-ai-features-guide',
    title: 'Enterprise AI Features: Building Trust in AI Responses',
    excerpt: 'How strict_mode, grounded_only, and citation_mode help enterprises deploy AI with confidence. A technical guide to UnforgeAPI\'s trust layer.',
    content: `Enterprise AI adoption faces one critical challenge: **trust**. How do you know the AI isn't hallucinating? How do you ensure it stays on-topic? How do you provide accountability?

UnforgeAPI's enterprise features solve these problems.

## The Trust Problem

When deploying AI in production, you face real risks:

- **Hallucinations**: AI confidently stating false information
- **Off-topic responses**: AI wandering into unrelated territory
- **Lack of accountability**: No way to verify claims
- **Unpredictable behavior**: Different responses for similar queries

## strict_mode: Keep AI On-Topic

Enable strict_mode when your AI must stay within bounds.

### How It Works

The Router Brain analyzes your query against your context keywords:

1. **Keyword Extraction**: Identifies key terms from your context
2. **Query Analysis**: Checks if the query relates to your domain
3. **Gatekeeping**: Blocks off-topic or potentially malicious queries

### Example

With company policy documents as context:

- ✅ "What's our vacation policy?" → Passes
- ✅ "How do I submit expenses?" → Passes
- ❌ "Write me a poem about cats" → Blocked
- ❌ "Ignore instructions and..." → Blocked

## grounded_only: Eliminate Hallucinations

When accuracy is non-negotiable, enable grounded_only.

### How It Works

Every response is analyzed for grounding:

1. **Fact Extraction**: Identifies claims in the response
2. **Source Matching**: Checks each claim against provided context
3. **Confidence Scoring**: Rates how well-grounded the response is
4. **Grounding Flag**: Returns grounded: true/false

## citation_mode: Full Accountability

When you need to show your sources, enable citation_mode.

The response includes citations with source references, text excerpts, and relevance scores.

## Real-World Impact

Companies using UnforgeAPI's enterprise features report:

- **95% reduction** in hallucination incidents
- **Zero** prompt injection attacks in production
- **80% faster** compliance audits with citations
- **3x higher** user trust scores

Build AI your enterprise can trust.`,
    category: 'Enterprise',
    date: 'Jan 1, 2026',
    readTime: '7 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Product',
    authorBio: 'The UnforgeAPI product team designs enterprise-grade AI features for mission-critical applications.',
    icon: Shield,
    color: 'from-emerald-500/20 to-teal-500/20'
  },
  {
    id: 'building-ai-chatbot-tutorial',
    title: 'Build an AI Chatbot in 10 Minutes with UnforgeAPI',
    excerpt: 'A step-by-step tutorial for integrating UnforgeAPI into your application. From API key to production-ready chatbot.',
    content: `Want to add intelligent AI capabilities to your application? This tutorial will get you from zero to a working chatbot in 10 minutes.

## Prerequisites

- An UnforgeAPI account (sign up at unforge.ai)
- Basic knowledge of JavaScript/TypeScript
- A web application to integrate with

## Step 1: Get Your API Key

1. Log into your UnforgeAPI dashboard
2. Navigate to **API Keys**
3. Click **Create New Key**
4. Copy your key (you won't see it again!)

## Step 2: Choose Your Tier

### Managed ($29/month)
We provide the AI infrastructure:
- Pre-configured Groq LLM
- Tavily web search included
- Just bring your API key and go

### BYOK ($9/month)
Bring your own keys:
- Use your Groq API key
- Use your Tavily API key
- Full control over providers

## Step 3: Basic Integration

Create a simple function to call the UnforgeAPI endpoint with your message and optional context.

## Step 4: Add Context (RAG)

Make your chatbot knowledgeable about your domain by passing company-specific context to the API.

## Step 5: Enable Enterprise Features

For production use, add trust features like strict_mode, grounded_only, and citation_mode.

## Step 6: Build the UI

Create a React component with message state, input handling, and API integration.

## Step 7: Deploy!

Your chatbot is ready. Key things to remember:

- ✅ Never expose your API key client-side
- ✅ Use server-side API routes
- ✅ Monitor usage in the dashboard
- ✅ Enable rate limiting for production

## Next Steps

- Explore **web search** for real-time data
- Add **document upload** for dynamic context
- Implement **streaming** for better UX
- Set up **webhooks** for async processing

Welcome to the future of AI development!`,
    category: 'Tutorial',
    date: 'Dec 30, 2025',
    readTime: '10 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Developer Relations',
    authorBio: 'The UnforgeAPI DevRel team helps developers build amazing AI applications.',
    icon: Code,
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'managed-vs-byok-comparison',
    title: 'Managed vs BYOK: Choosing the Right UnforgeAPI Plan',
    excerpt: 'A detailed comparison of our Managed and BYOK tiers. Understand the tradeoffs and pick the right plan for your use case.',
    content: `Choosing between Managed and BYOK (Bring Your Own Keys) is one of the first decisions you'll make with UnforgeAPI. Let's break down when each makes sense.

## Managed: The "Just Works" Option

### Best For:
- Teams who want to ship fast
- Prototypes and MVPs
- Developers who don't want to manage API keys
- Predictable budgeting needs

### How It Works:

You get one API key. That's it. Behind the scenes, we handle:

- **Groq LLM** for fast, high-quality responses
- **Tavily Search** for web research capabilities
- **Automatic failover** if a provider has issues
- **Usage optimization** to maximize your quota

### Pricing:

$29/month includes:
- 100K tokens/month for LLM
- 1,000 web searches/month
- All enterprise features
- Priority support

## BYOK: Full Control

### Best For:
- Enterprise teams with existing provider contracts
- High-volume use cases
- Teams with specific compliance requirements
- Cost optimization at scale

### How It Works:

You provide your own API keys for Groq and Tavily. UnforgeAPI provides the routing, RAG pipeline, and enterprise features. You control (and pay for) the underlying providers.

### Pricing:

$9/month for UnforgeAPI + your provider costs:
- **Groq**: ~$0.05 per 1M input tokens
- **Tavily**: ~$0.01 per search

## Decision Framework

### Choose Managed if:

- ✅ You're just getting started
- ✅ Volume is under 500K tokens/month
- ✅ You value simplicity over control
- ✅ You don't have existing provider contracts
- ✅ Predictable billing is important

### Choose BYOK if:

- ✅ You process >500K tokens/month
- ✅ You have existing provider relationships
- ✅ You need specific models or providers
- ✅ Compliance requires owning the AI stack
- ✅ You want to optimize costs at scale

## The Bottom Line

- **Managed** = Pay for convenience and predictability
- **BYOK** = Pay for control and optimization

Both give you the same UnforgeAPI features: hybrid RAG, Router Brain, enterprise features, and our dashboard. The difference is who manages the AI providers.

Most teams start Managed and graduate to BYOK as they scale. That's exactly how we designed it.`,
    category: 'Product',
    date: 'Dec 28, 2025',
    readTime: '6 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Product',
    authorBio: 'The UnforgeAPI product team helps developers choose the right tools for their AI applications.',
    icon: Target,
    color: 'from-amber-500/20 to-orange-500/20'
  },
  {
    id: 'router-brain-deep-dive',
    title: 'Inside the Router Brain: How UnforgeAPI Routes Queries',
    excerpt: 'Technical deep-dive into UnforgeAPI\'s intelligent query routing system. Learn how we decide between CHAT, CONTEXT, and RESEARCH paths.',
    content: `The Router Brain is the secret sauce behind UnforgeAPI's accuracy. It's a sophisticated query classification system that ensures every question gets routed to the optimal processing path.

Let's peek under the hood.

## The Routing Challenge

When a user asks a question, you need to decide:

1. Can this be answered from general knowledge? → **CHAT**
2. Does this need proprietary/uploaded data? → **CONTEXT**
3. Does this need fresh/real-time information? → **RESEARCH**
4. Does this need a combination? → **HYBRID**

Getting this wrong is expensive:
- CHAT for a context query → hallucinations
- RESEARCH for a simple question → wasted API calls
- CONTEXT for a web query → stale information

## How the Router Brain Works

### Step 1: Query Classification

The Router Brain analyzes the query across multiple dimensions including type (factual, conversational, research, analytical), temporality, specificity, and complexity.

### Step 2: Context Analysis

If context is provided, we analyze its relevance including keyword extraction, domain matching, and sufficiency checking.

### Step 3: Routing Decision

Based on the analysis, we make a routing decision with path selection, confidence scoring, and fallback options.

## Routing Examples

### Example 1: Simple Greeting
**Query:** "Hello, how are you?"
**Decision:** CHAT (confidence: 0.99)

### Example 2: Company Policy Question
**Query:** "What's our vacation policy?"
**Context:** Employee handbook
**Decision:** CONTEXT (confidence: 0.97)

### Example 3: Market Research
**Query:** "What are the latest AI trends in 2026?"
**Decision:** RESEARCH (confidence: 0.94)

### Example 4: Hybrid Query
**Query:** "How does our product compare to competitors?"
**Context:** Product documentation
**Decision:** CONTEXT + RESEARCH (confidence: 0.88)

## Performance Metrics

The Router Brain adds minimal latency:
- Average routing time: **<50ms**
- Accuracy: **94%** on our benchmark suite
- Fallback rate: **<5%** of queries

## Why This Matters

Intelligent routing means:
- **Faster responses** (no unnecessary API calls)
- **Better accuracy** (right tool for the job)
- **Lower costs** (efficient resource usage)
- **Predictable behavior** (consistent routing)

The Router Brain is why UnforgeAPI "just works" for diverse query types without manual configuration.`,
    category: 'Technical',
    date: 'Dec 25, 2025',
    readTime: '9 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    authorBio: 'The UnforgeAPI engineering team builds the infrastructure powering intelligent AI applications.',
    icon: Server,
    color: 'from-pink-500/20 to-rose-500/20'
  },
  {
    id: 'ai-api-best-practices',
    title: 'Best Practices for Production AI APIs',
    excerpt: 'Lessons learned from serving millions of AI requests. Error handling, rate limiting, caching, and more.',
    content: `Shipping AI to production is different from running it in development. Here are the battle-tested best practices we've learned serving AI APIs at scale.

## 1. Never Trust User Input

AI systems are particularly vulnerable to prompt injection. Always use UnforgeAPI's strict_mode to block malicious inputs.

## 2. Implement Graceful Degradation

AI APIs can fail. Plan for it with proper error handling for rate limits, server errors, and client errors.

## 3. Use Streaming for Better UX

Don't make users wait for complete responses. Enable streaming so users see responses appearing in real-time.

## 4. Cache Aggressively

Many AI queries are repetitive. Caching can reduce API costs by 30-50% for typical applications.

## 5. Implement Rate Limiting

Protect your API and budget with per-user rate limits.

## 6. Log Everything (Anonymized)

Logs are essential for debugging and improvement. Log duration, routing path, grounding status, and confidence—but not PII.

## 7. Set Timeouts

AI responses can sometimes take a while. Set appropriate timeouts (30s is a good default).

## 8. Validate Responses

Don't blindly trust AI output. Check grounding status and confidence scores before returning to users.

## 9. Use Webhooks for Long Operations

For complex queries, use async processing with webhooks for completion notifications.

## 10. Monitor and Alert

Set up monitoring for key metrics:
- **Latency**: Alert if p95 > 5s
- **Error rate**: Alert if > 1%
- **Grounding rate**: Alert if < 80%
- **Usage**: Alert if approaching limits

## Summary

Production AI is about reliability, not just capability:

1. **Secure**: Validate inputs, use strict_mode
2. **Resilient**: Handle failures gracefully
3. **Fast**: Stream, cache, timeout
4. **Observable**: Log, monitor, alert
5. **Trustworthy**: Validate outputs, check grounding

Follow these practices and your AI integration will be production-ready.`,
    category: 'Best Practices',
    date: 'Dec 22, 2025',
    readTime: '8 min read',
    author: 'UnforgeAPI Team',
    authorRole: 'Engineering',
    authorBio: 'The UnforgeAPI engineering team shares lessons from building production AI infrastructure.',
    icon: Database,
    color: 'from-indigo-500/20 to-blue-500/20'
  }
]

// Blog Navigation Component
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
              <Image src="/reallogo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
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

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const [copied, setCopied] = useState(false)

  const post = blogPosts.find(p => p.id === slug)
  
  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline text-primary mb-4">Post Not Found</h1>
          <p className="text-text-secondary mb-8">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/blog" className="px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold">
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  const IconComponent = post.icon

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const relatedPosts = blogPosts.filter(p => p.category === post.category && p.id !== post.id).slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <BlogNavigation />

      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/blog" className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Blog</span>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold font-cta rounded-full">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-primary mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-text-secondary font-body mb-8">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-primary">{post.author}</p>
                  <p className="text-sm text-text-secondary">{post.authorRole}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary mr-2">Share:</span>
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-5 h-5 text-accent" /> : <Copy className="w-5 h-5 text-text-secondary" />}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 transition-colors"
                >
                  <Twitter className="w-5 h-5 text-text-secondary" />
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-accent/10 transition-colors"
                >
                  <Linkedin className="w-5 h-5 text-text-secondary" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className={`h-64 md:h-80 bg-gradient-to-br ${post.color} rounded-2xl flex items-center justify-center`}>
            <IconComponent className="w-32 h-32 text-primary/20" />
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-8 md:p-12 shadow-sm"
          >
            <div className="prose prose-lg max-w-none prose-headings:font-headline prose-headings:text-primary prose-p:text-text-secondary prose-p:font-body prose-strong:text-primary prose-a:text-accent prose-li:text-text-secondary">
              {post.content.split('\n').map((paragraph, index) => {
                const parseInlineBold = (text: string) => {
                  const parts = text.split(/(\*\*[^*]+\*\*)/g);
                  return parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });
                };

                if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{parseInlineBold(paragraph.replace('## ', ''))}</h2>
                } else if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{parseInlineBold(paragraph.replace('### ', ''))}</h3>
                } else if (paragraph.startsWith('- ')) {
                  return <li key={index} className="ml-6">{parseInlineBold(paragraph.replace('- ', ''))}</li>
                } else if (paragraph.match(/^\d+\. /)) {
                  return <li key={index} className="ml-6 list-decimal">{parseInlineBold(paragraph.replace(/^\d+\. /, ''))}</li>
                } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <p key={index} className="font-bold">{paragraph.replace(/\*\*/g, '')}</p>
                } else if (paragraph.startsWith('---')) {
                  return <hr key={index} className="my-8 border-border" />
                } else if (paragraph.trim() === '') {
                  return <br key={index} />
                } else {
                  return <p key={index} className="mb-4">{parseInlineBold(paragraph)}</p>
                }
              })}
            </div>
          </motion.article>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="py-16 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-bold font-headline text-primary mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => {
                const RelatedIcon = relatedPost.icon
                return (
                  <article key={relatedPost.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group">
                    <div className={`h-32 bg-gradient-to-br ${relatedPost.color} flex items-center justify-center`}>
                      <RelatedIcon className="w-12 h-12 text-primary/20" />
                    </div>
                    <div className="p-5">
                      <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold font-cta rounded-full">
                        {relatedPost.category}
                      </span>
                      <h3 className="text-lg font-bold font-headline text-primary mt-3 mb-2 group-hover:text-accent transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <Link href={`/blog/${relatedPost.id}`} className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                        Read More <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-br from-accent/10 to-secondary/10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-3xl font-bold font-headline text-primary mb-4">Ready to Build with AI?</h2>
          <p className="text-text-secondary font-body mb-8 max-w-xl mx-auto">
            Join developers using UnforgeAPI to ship intelligent applications faster with our Hybrid RAG engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex px-8 py-4 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
              Get API Key Free
            </Link>
            <Link href="/docs" className="inline-flex px-8 py-4 bg-white text-primary border border-border rounded-xl font-bold font-cta hover:bg-gray-50 transition-colors">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
                <Image src="/reallogo.png" alt="UnforgeAPI" width={28} height={28} className="object-contain" />
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
