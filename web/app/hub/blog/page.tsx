import Link from 'next/link'
import { ArrowRight, Calendar, Clock, Tag } from 'lucide-react'

const blogPosts = [
  {
    slug: 'deep-research-api-machines-ai-agents',
    title: 'Deep Research API: The Missing Layer for AI Agents',
    excerpt: 'Why current AI agents struggle with real-time information and how Deep Research API solves this with structured JSON output and web grounding.',
    date: '2025-01-15',
    readTime: '8 min read',
    category: 'AI Agents',
    image: '/blog/deep-research-api.jpg',
    featured: true
  },
  {
    slug: 'structured-json-output-ai-automation',
    title: 'Why Structured JSON Output Matters for AI Automation',
    excerpt: 'Learn how deterministic JSON schemas enable reliable AI agent pipelines and eliminate parsing errors.',
    date: '2025-01-10',
    readTime: '6 min read',
    category: 'Development',
    image: '/blog/structured-json.jpg',
    featured: true
  },
  {
    slug: 'web-grounding-ai-agents',
    title: 'Web Grounding: Making AI Agents Factually Accurate',
    excerpt: 'Real-time web search integration prevents hallucinations and ensures your AI agents provide accurate, up-to-date information.',
    date: '2025-01-08',
    readTime: '7 min read',
    category: 'AI Agents',
    image: '/blog/web-grounding.jpg',
    featured: false
  },
  {
    slug: 'byok-unlimited-scaling',
    title: 'BYOK: How to Scale AI Agents Without Limits',
    excerpt: 'Bring Your Own Key architecture allows unlimited scaling with zero markup. Learn how to integrate with Groq and Tavily.',
    date: '2025-01-05',
    readTime: '5 min read',
    category: 'Infrastructure',
    image: '/blog/byok-scaling.jpg',
    featured: false
  },
  {
    slug: '30-second-research-pipeline',
    title: 'Building a 30-Second Deep Research Pipeline',
    excerpt: 'Multi-stage AI architecture optimized for speed. Web search, reasoning, and JSON rendering in under 40 seconds.',
    date: '2024-12-28',
    readTime: '10 min read',
    category: 'Engineering',
    image: '/blog/research-pipeline.jpg',
    featured: false
  },
  {
    slug: 'custom-schemas-data-extraction',
    title: 'Custom Schemas: Extract Exactly What You Need',
    excerpt: 'Define your own JSON schema and get clean arrays of prices, features, or any structured data from web research.',
    date: '2024-12-20',
    readTime: '6 min read',
    category: 'Development',
    image: '/blog/custom-schemas.jpg',
    featured: false
  },
  {
    slug: 'ai-agent-integration-guide',
    title: 'Complete Guide to Integrating Deep Research into AI Agents',
    excerpt: 'Step-by-step tutorial on building AI agents that use Deep Research API for real-time information retrieval.',
    date: '2024-12-15',
    readTime: '12 min read',
    category: 'Tutorial',
    image: '/blog/agent-integration.jpg',
    featured: false
  },
  {
    slug: 'cost-optimization-ai-apis',
    title: 'Cut AI Costs by 70% with Intelligent Routing',
    excerpt: 'Smart query routing avoids expensive web searches when context is sufficient. Save money without sacrificing quality.',
    date: '2024-12-10',
    readTime: '8 min read',
    category: 'Infrastructure',
    image: '/blog/cost-optimization.jpg',
    featured: false
  },
  {
    slug: 'webhook-delivery-async-ai',
    title: 'Webhook Delivery: Fire and Forget Research',
    excerpt: 'Async webhook callbacks eliminate polling. Get results POSTed to your endpoint when research completes.',
    date: '2024-12-05',
    readTime: '5 min read',
    category: 'Engineering',
    image: '/blog/webhooks.jpg',
    featured: false
  },
  {
    slug: 'domain-presets-better-results',
    title: 'Domain Presets: Optimized Sources for Every Industry',
    excerpt: 'Crypto, stocks, tech, academic, news - get better results with curated source lists for your use case.',
    date: '2024-11-28',
    readTime: '7 min read',
    category: 'Features',
    image: '/blog/domain-presets.jpg',
    featured: false
  },
]

const categories = ['All', 'AI Agents', 'Development', 'Infrastructure', 'Engineering', 'Tutorial', 'Features']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10v0a10 10 0 0 1-10-10z" />
                </svg>
              </div>
              <span className="font-bold text-lg">UnforgeAPI</span>
            </Link>
            <nav className="hidden md:flex gap-6 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Docs</Link>
              <Link href="/hub/blog" className="text-white font-medium">Blog</Link>
              <Link href="/signup" className="bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-lg font-medium transition-colors">Get Started</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Deep Research API for{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Machines & AI Agents
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Tutorials, guides, and insights on building intelligent AI agents with real-time research capabilities.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Post */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm font-medium text-purple-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Featured
          </div>
          <Link
            href={`/hub/blog/${blogPosts[0].slug}`}
            className="group block bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all"
          >
            <div className="grid md:grid-cols-2 gap-8 p-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                  <Tag className="w-3 h-3" />
                  {blogPosts[0].category}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  {blogPosts[0].title}
                </h2>
                <p className="text-gray-400 line-clamp-3">
                  {blogPosts[0].excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(blogPosts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {blogPosts[0].readTime}
                  </div>
                </div>
                <div className="pt-4 flex items-center text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
                  Read Article
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="relative h-64 md:h-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10v0a10 10 0 0 1-10-10z" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-400">Featured Post</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Blog Grid */}
        <h2 className="text-2xl font-bold text-white mb-6">Latest Articles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.slice(1).map((post) => (
            <Link
              key={post.slug}
              href={`/hub/blog/${post.slug}`}
              className="group block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10v0a10 10 0 0 1-10-10z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <div className="inline-flex items-center gap-2 px-2 py-1 bg-white/5 rounded text-xs font-medium text-gray-400 mb-3">
                  <Tag className="w-3 h-3" />
                  {post.category}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Stay Updated</h2>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">
            Get the latest articles on Deep Research API, AI agents, and machine learning delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10v0a10 10 0 0 1-10-10z" />
                </svg>
              </div>
              <span className="font-bold text-white">UnforgeAPI</span>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Documentation</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
            </div>
            <div className="text-sm text-gray-500">
              © 2026 UnforgeAPI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
