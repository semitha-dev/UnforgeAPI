'use client'

import Link from 'next/link'
import { ArrowLeft, Users, Target, Zap, Shield, Globe, Code } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-violet-500/5 via-black to-fuchsia-500/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20 mb-6">
            <Users className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-violet-400">About Us</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Making AI Accessible for Every Developer
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            UnforgeAPI was built with one mission: to make powerful AI capabilities accessible and cost-effective for developers everywhere.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-violet-400" />
                </div>
                <h2 className="text-3xl font-bold">Our Mission</h2>
              </div>
              <p className="text-gray-400 mb-4">
                We believe that AI should be accessible to every developer, not just those with massive budgets. Traditional AI APIs are expensive and often wasteful - charging the same for simple greetings as complex research queries.
              </p>
              <p className="text-gray-400">
                UnforgeAPI uses intelligent routing to dramatically reduce costs while maintaining quality. Our Router Brain classifies queries and picks the cheapest path that still delivers great results.
              </p>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-8 border border-white/10">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4">
                  <div className="text-4xl font-bold text-violet-400 mb-2">80%</div>
                  <p className="text-sm text-gray-400">Cost Savings</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold text-violet-400 mb-2">&lt;100ms</div>
                  <p className="text-sm text-gray-400">Latency</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold text-violet-400 mb-2">3</div>
                  <p className="text-sm text-gray-400">Routing Paths</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold text-violet-400 mb-2">24/7</div>
                  <p className="text-sm text-gray-400">API Availability</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-neutral-950">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-neutral-900 rounded-2xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Developer-First</h3>
              <p className="text-gray-400">
                Every feature we build starts with one question: "How does this help developers build better AI applications?"
              </p>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-fuchsia-500/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Enterprise Ready</h3>
              <p className="text-gray-400">
                Built-in security features like strict_mode, grounded_only, and citation_mode make our API production-ready from day one.
              </p>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-8 border border-white/10">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Transparency</h3>
              <p className="text-gray-400">
                Clear pricing, honest documentation, and no hidden fees. You always know what you're paying for.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Built by Engineers, for Engineers</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            UnforgeAPI was created by developers who experienced firsthand the pain of expensive AI APIs. We're committed to building the tools we wish we had.
          </p>
          <Link 
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            <Code className="w-5 h-5" />
            Read the Docs
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
