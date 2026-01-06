'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Shield, 
  DollarSign, 
  Code, 
  ArrowRight, 
  Check, 
  ChevronDown,
  Cpu,
  Globe,
  MessageSquare,
  FileText,
  Search,
  Clock,
  BarChart3,
  Key,
  Menu,
  X,
  Sparkles,
  Bot,
  Gauge
} from 'lucide-react';

// Navigation Component
const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">UnforgeAPI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#deep-research" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Deep Research</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</a>
            <Link href="/docs" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Docs</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/signin" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 border-t border-white/10"
          >
            <div className="px-6 py-4 space-y-4">
              <a href="#features" className="block text-gray-400 hover:text-white">Features</a>
              <a href="#deep-research" className="block text-gray-400 hover:text-white">Deep Research</a>
              <a href="#how-it-works" className="block text-gray-400 hover:text-white">How it Works</a>
              <a href="#pricing" className="block text-gray-400 hover:text-white">Pricing</a>
              <Link href="/signin" className="block text-gray-400 hover:text-white">Sign In</Link>
              <Link href="/signup" className="block py-2 text-center bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg text-white">
                Get Started Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

// Hero Section
const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-violet-500/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Public Beta - Now Available</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Stop Paying the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              "Dumb Agent" Tax
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            UnforgeAPI is a Hybrid RAG Router that intelligently routes queries to the most efficient path.
            Save up to <span className="text-white font-semibold">70% on API costs</span> while reducing latency by 3x.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <Code className="w-5 h-5" />
              View Documentation
            </a>
          </div>

          {/* Code Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 ml-2">POST /v1/chat</span>
              </div>
              <pre className="p-6 text-left overflow-x-auto">
                <code className="text-sm">
                  <span className="text-gray-500">{'// One endpoint. Three intelligent paths.'}</span>{'\n'}
                  <span className="text-fuchsia-400">const</span> <span className="text-white">response</span> <span className="text-gray-400">=</span> <span className="text-fuchsia-400">await</span> <span className="text-violet-400">fetch</span><span className="text-gray-400">(</span><span className="text-green-400">'https://homerun-snowy.vercel.app/api/v1/chat'</span><span className="text-gray-400">,</span> <span className="text-gray-400">{'{'}</span>{'\n'}
                  <span className="text-white">  method</span><span className="text-gray-400">:</span> <span className="text-green-400">'POST'</span><span className="text-gray-400">,</span>{'\n'}
                  <span className="text-white">  headers</span><span className="text-gray-400">:</span> <span className="text-gray-400">{'{'}</span> <span className="text-green-400">'Authorization'</span><span className="text-gray-400">:</span> <span className="text-green-400">`Bearer ${'${'}API_KEY{'}'}`</span> <span className="text-gray-400">{'}'},</span>{'\n'}
                  <span className="text-white">  body</span><span className="text-gray-400">:</span> <span className="text-violet-400">JSON</span><span className="text-gray-400">.</span><span className="text-violet-400">stringify</span><span className="text-gray-400">(</span><span className="text-gray-400">{'{'}</span>{'\n'}
                  <span className="text-white">    query</span><span className="text-gray-400">:</span> <span className="text-green-400">"What's the deadline for Project X?"</span><span className="text-gray-400">,</span>{'\n'}
                  <span className="text-white">    context</span><span className="text-gray-400">:</span> <span className="text-green-400">"Project X deadline: Jan 15, 2026..."</span>{'\n'}
                  <span className="text-gray-400">  {'})'}</span>{'\n'}
                  <span className="text-gray-400">{'})'}</span>{'\n\n'}
                  <span className="text-gray-500">{'// Response: Routed to CONTEXT path (no web search!)'}</span>{'\n'}
                  <span className="text-gray-500">{'// → Cost: $0.0001 | Latency: 0.3s | Savings: 90%'}</span>
                </code>
              </pre>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Stats Section
const StatsSection = () => {
  const stats = [
    { value: '70%', label: 'Cost Reduction', icon: DollarSign },
    { value: '3x', label: 'Faster Responses', icon: Zap },
    { value: '99.9%', label: 'Uptime SLA', icon: Shield },
    { value: '<100ms', label: 'Router Latency', icon: Clock },
  ];

  return (
    <section className="relative py-20 border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <stat.icon className="w-8 h-8 text-violet-400 mx-auto mb-3" />
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const features = [
    {
      icon: Cpu,
      title: 'Intelligent Router Brain',
      description: 'Our specialized classifier analyzes intent in under 100ms to determine the optimal execution path.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: MessageSquare,
      title: 'CHAT Path',
      description: 'Greetings and casual conversation routed to fast Llama-3-8b. No search costs incurred.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: FileText,
      title: 'CONTEXT Path',
      description: 'Questions answerable from your provided context skip web search entirely. Maximum savings.',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      icon: Search,
      title: 'RESEARCH Path',
      description: 'Factual queries that need current data get Tavily search + Llama-3-70b synthesis.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Shield,
      title: 'Privacy-First',
      description: 'Zero data retention. Queries and context exist only in ephemeral memory during the request.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Key,
      title: 'BYOK Support',
      description: 'Bring your own Groq and Tavily keys for unlimited scaling with zero markup.',
      gradient: 'from-amber-500 to-yellow-500',
    },
  ];

  return (
    <section id="features" className="relative py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Three Paths. One Smart Router.
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Stop burning money on unnecessary API calls. UnforgeAPI routes each query to the most cost-effective path.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Deep Research Section
const DeepResearchSection = () => {
  return (
    <section id="deep-research" className="relative py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">New: Turbo Mode</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Deep Research for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Systems
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Ultra-fast structured research for agents and backend systems.{' '}
            <span className="text-white">Perplexity is for humans — Unforge Deep Research is for machines.</span>
          </p>
        </motion.div>

        {/* Architecture Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {/* Architecture Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-gray-400 font-mono">Flash-Groq Relay Architecture</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">~4s faster than Perplexity</span>
            </div>

            {/* Architecture Flow */}
            <div className="p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Step 1: Query */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">1. Search</div>
                  <div className="text-xs text-gray-500">Tavily fetches raw content</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 2: Gemini */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <Cpu className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">2. Reason</div>
                  <div className="text-xs text-gray-500">Gemini extracts structured JSON</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 3: Groq */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">3. Render</div>
                  <div className="text-xs text-gray-500">Groq writes English at hardware speed</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 4: Output */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">4. Report</div>
                  <div className="text-xs text-gray-500">Structured, cited, API-ready</div>
                </div>
              </div>

              {/* Key Insight */}
              <div className="mt-8 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                <p className="text-center text-sm text-gray-300">
                  <span className="text-violet-400 font-medium">The secret:</span>{' '}
                  Gemini performs compact structured reasoning. Groq renders the result into English at hardware speed.{' '}
                  <span className="text-white font-medium">Result: deep research without the latency tax.</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <Gauge className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Optimized for Latency</h3>
            <p className="text-gray-400 text-sm">
              Separation of thinking (Gemini) and writing (Groq) eliminates the single-model bottleneck. End-to-end in ~4 seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <Bot className="w-10 h-10 text-violet-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Built for Automation</h3>
            <p className="text-gray-400 text-sm">
              Deterministic, machine-friendly output designed for APIs and agent pipelines — not conversational fluff.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <Key className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">BYOK Gemini Supported</h3>
            <p className="text-gray-400 text-sm">
              Bring your own Gemini, Groq, and Tavily keys. Full control over costs with zero markup on your tokens.
            </p>
          </motion.div>
        </div>

        {/* Code Example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-500 ml-2">POST /v1/deep-research</span>
            </div>
            <pre className="p-6 text-left overflow-x-auto">
              <code className="text-sm">
                <span className="text-fuchsia-400">const</span> <span className="text-white">report</span> <span className="text-gray-400">=</span> <span className="text-fuchsia-400">await</span> <span className="text-violet-400">fetch</span><span className="text-gray-400">(</span><span className="text-green-400">'/api/v1/deep-research'</span><span className="text-gray-400">,</span> <span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">  method</span><span className="text-gray-400">:</span> <span className="text-green-400">'POST'</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">  headers</span><span className="text-gray-400">:</span> <span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">    </span><span className="text-green-400">'Authorization'</span><span className="text-gray-400">:</span> <span className="text-green-400">`Bearer ${'${'}API_KEY{'}'}`</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-gray-500">    // Optional: BYOK headers</span>{'\n'}
                <span className="text-white">    </span><span className="text-green-400">'x-gemini-key'</span><span className="text-gray-400">:</span> <span className="text-green-400">'your-gemini-key'</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">    </span><span className="text-green-400">'x-groq-key'</span><span className="text-gray-400">:</span> <span className="text-green-400">'your-groq-key'</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-gray-400">  {'}'},</span>{'\n'}
                <span className="text-white">  body</span><span className="text-gray-400">:</span> <span className="text-violet-400">JSON</span><span className="text-gray-400">.</span><span className="text-violet-400">stringify</span><span className="text-gray-400">(</span><span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">    query</span><span className="text-gray-400">:</span> <span className="text-green-400">"Latest AI agent frameworks comparison 2026"</span>{'\n'}
                <span className="text-gray-400">  {'})'}</span>{'\n'}
                <span className="text-gray-400">{'})'}</span>{'\n\n'}
                <span className="text-gray-500">{'// Response in ~4 seconds'}</span>{'\n'}
                <span className="text-gray-500">{'// → Structured report with citations'}</span>{'\n'}
                <span className="text-gray-500">{'// → meta.latency_ms: 3847'}</span>
              </code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// How It Works Section
const HowItWorksSection = () => {
  const steps = [
    {
      step: '01',
      title: 'Send Your Request',
      description: 'POST to /v1/chat with your query and optional context (documents, emails, database rows).',
      code: `fetch('/v1/chat', {
  body: JSON.stringify({
    query: "User question",
    context: "Local data..."
  })
})`,
    },
    {
      step: '02',
      title: 'Router Analyzes Intent',
      description: 'Our Router Brain classifies the query in <100ms using pattern matching and lightweight ML.',
      code: `// Router Decision
{
  "intent": "CONTEXT",
  "confidence": 0.95,
  "reason": "Answerable from provided data"
}`,
    },
    {
      step: '03',
      title: 'Optimal Path Execution',
      description: 'Query is routed to CHAT, CONTEXT, or RESEARCH path based on what is actually needed.',
      code: `// Response
{
  "answer": "Based on your document...",
  "meta": {
    "routed_to": "CONTEXT",
    "cost_savings": true
  }
}`,
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Integrate in minutes. See savings immediately.
          </p>
        </motion.div>

        <div className="space-y-12">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8`}
            >
              <div className="flex-1">
                <div className="text-violet-400 font-mono text-sm mb-2">Step {item.step}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="bg-gray-900/80 border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-gray-300">{item.code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Section
const PricingSection = () => {
  const [activeTab, setActiveTab] = useState<'managed' | 'byok'>('managed');

  const managedPlans = [
    {
      name: 'Sandbox',
      price: 'Free',
      period: '',
      description: 'Perfect for testing the API',
      features: [
        '50 requests / day',
        'Chat & Context paths only',
        '❌ Search disabled',
        'System API keys',
        'Community support',
      ],
      cta: 'Start Free',
      popular: false,
      badge: null,
    },
    {
      name: 'Managed Pro',
      price: '$20',
      period: '/month',
      description: 'For production applications',
      features: [
        'Unlimited Chat & Context',
        '1,000 Web Search requests / month',
        '✅ Full research capabilities',
        'System API keys',
        'Priority support',
        '50,000 req/mo fair usage policy',
      ],
      cta: 'Start Trial',
      popular: true,
      badge: 'Most Popular',
    },
  ];

  const byokPlans = [
    {
      name: 'BYOK Starter',
      price: 'Free',
      period: '',
      description: 'Test the engine with your own keys',
      features: [
        '100 requests / day',
        'All three routing paths',
        '✅ Search enabled',
        'Your Groq & Tavily keys required',
        'Community support',
      ],
      cta: 'Get Started',
      popular: false,
      badge: 'New',
    },
    {
      name: 'BYOK Unlimited',
      price: '$5',
      period: '/month',
      description: 'Production scale. No limits.',
      features: [
        'Unlimited requests',
        '10 req/sec rate limit',
        '✅ All routing paths',
        'Your Groq & Tavily keys',
        'Premium support',
        'Zero markup on tokens',
      ],
      cta: 'Go Unlimited',
      popular: true,
      badge: 'Best Value',
    },
  ];

  const activePlans = activeTab === 'managed' ? managedPlans : byokPlans;

  return (
    <section id="pricing" className="relative py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Choose Your Infrastructure
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Two paths to intelligent query routing. Pick the one that fits your workflow.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab('managed')}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'managed'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Managed</span>
              </div>
              <div className="text-xs opacity-70 mt-0.5">We provide the keys</div>
            </button>
            
            <div className="px-4 text-gray-600 font-medium">— OR —</div>
            
            <button
              onClick={() => setActiveTab('byok')}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'byok'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>BYOK</span>
              </div>
              <div className="text-xs opacity-70 mt-0.5">Bring your own keys</div>
            </button>
          </div>
        </div>

        {/* Plan Description */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {activeTab === 'managed' ? (
            <p className="text-gray-400 max-w-xl mx-auto">
              <span className="text-violet-400 font-medium">Zero configuration required.</span>{' '}
              We handle the LLM infrastructure. You just call the API.
            </p>
          ) : (
            <p className="text-gray-400 max-w-xl mx-auto">
              <span className="text-amber-400 font-medium">Maximum control & savings.</span>{' '}
              Use your own Groq and Tavily API keys with zero markup.
            </p>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {activePlans.map((plan, index) => (
            <motion.div
              key={`${activeTab}-${plan.name}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? activeTab === 'managed'
                    ? 'bg-gradient-to-b from-violet-500/20 to-fuchsia-500/20 border-violet-500/50'
                    : 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-amber-500/50'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`px-4 py-1 text-white text-sm font-medium rounded-full ${
                    activeTab === 'managed'
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className={`w-5 h-5 flex-shrink-0 ${
                      activeTab === 'managed' ? 'text-violet-400' : 'text-amber-400'
                    }`} />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Link
                href="/signup"
                className={`block w-full py-3 text-center font-medium rounded-xl transition-colors ${
                  plan.popular
                    ? activeTab === 'managed'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Comparison Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400">
            <Globe className="w-4 h-4" />
            <span>Both paths use the same intelligent routing engine</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = [
    {
      question: 'How does the routing actually work?',
      answer: 'Our Router Brain uses a combination of pattern matching and lightweight ML to classify queries in under 100ms. It analyzes the query structure, checks if the provided context contains sufficient information, and routes to the optimal path (CHAT, CONTEXT, or RESEARCH).',
    },
    {
      question: 'What happens to my data?',
      answer: "We're privacy-first by design. Queries and context exist only in ephemeral memory during request processing. We don't store, log, or train on your data. For BYOK users, your API keys are used once and immediately discarded.",
    },
    {
      question: 'Can I use my own LLM provider?',
      answer: 'Yes! With our BYOK (Bring Your Own Key) tier, you can use your own Groq and Tavily API keys. This means zero markup on token usage and unlimited scaling based on your provider limits.',
    },
    {
      question: 'What models do you use?',
      answer: 'We use Llama-3-8b for CHAT path responses (fast, cost-effective) and Llama-3-70b for RESEARCH synthesis (high quality). Context path uses the same model as the determined best fit for the query complexity.',
    },
    {
      question: 'How do I migrate from my current setup?',
      answer: "It's a single endpoint change. Replace your current LLM API call with a POST to /v1/chat. Add an optional 'context' field with any local data you want prioritized. That's it - the router handles everything else.",
    },
  ];

  return (
    <section id="faq" className="relative py-32">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-gray-400">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  return (
    <section className="relative py-32">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 rounded-3xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Stop Overpaying?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join the developers who cut their AI costs by 70% with intelligent query routing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Get Your API Key
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-8 py-4 text-white font-semibold"
            >
              Read the Docs
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">UnforgeAPI</span>
          </div>
          
          <div className="flex items-center gap-8">
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link>
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</Link>
          </div>
          
          <div className="text-sm text-gray-500">
            © 2026 UnforgeAPI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <DeepResearchSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}

