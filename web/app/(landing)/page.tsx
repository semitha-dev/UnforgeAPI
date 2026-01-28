'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Sparkles,
  Bot,
  Gauge,
  Zap,
  XCircle,
  CheckCircle2,
  CheckCircle
} from 'lucide-react';

import { DeepResearchSection as NewDeepResearchSection } from './components/DeepResearchSection';
import { Navigation } from './components/Navigation';

// Hero Section - Connected Grid Mix
const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center pt-24 pb-20 overflow-hidden min-h-[90vh] landing-page">
      {/* Background - Connected Grid */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Main Grid */}
        <div className="absolute inset-0 connected-grid-bg" />

        {/* Floating Icons 'Network' */}
        <div className="absolute inset-0">
          {/* Top Left */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] p-3 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-xl hidden lg:block hover:scale-110 transition-transform cursor-default"
          >
            <Search className="w-5 h-5 text-blue-400" />
          </motion.div>
          {/* Connecting line */}
          <div className="absolute top-[18%] left-[12%] w-[20%] h-[1px] bg-gradient-to-r from-blue-500/20 to-transparent rotate-12 hidden lg:block" />

          {/* Bottom Right */}
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] right-[10%] p-3 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-xl hidden lg:block hover:scale-110 transition-transform cursor-default"
          >
            <Globe className="w-5 h-5 text-purple-400" />
          </motion.div>
          {/* Connecting line */}
          <div className="absolute bottom-[23%] right-[12%] w-[15%] h-[1px] bg-gradient-to-r from-transparent to-purple-500/20 -rotate-12 hidden lg:block" />

          {/* Top Right */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[20%] right-[15%] p-3 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-xl hidden lg:block hover:scale-110 transition-transform cursor-default"
          >
            <FileText className="w-5 h-5 text-pink-400" />
          </motion.div>

          {/* Bottom Left */}
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[25%] left-[15%] p-3 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-xl hidden lg:block hover:scale-110 transition-transform cursor-default"
          >
            <Zap className="w-5 h-5 text-yellow-400" />
          </motion.div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10 w-full grid lg:grid-cols-1 gap-12 lg:gap-16 items-center">

        {/* Header Content */}
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors cursor-default">
              <span className="flex relative h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-semibold tracking-wide text-gray-300">RESEARCH API V4 IS LIVE</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[0.95] drop-shadow-2xl">
              Knowledge for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400">
                AI Agents
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10 font-medium">
              Give your LLMs real-time access to the entire web. <br className="hidden sm:block" />
              <span className="text-white decoration-purple-500/30 underline decoration-2 underline-offset-4">Structured JSON</span> output in under 30 seconds.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/signup"
                className="group relative inline-flex justify-center items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold transition-all hover:-translate-y-1 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
              >
                Get API Key
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => document.getElementById('deep-research')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-medium transition-all text-gray-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
              >
                <Code className="w-4 h-4" />
                Read the Docs
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Research Console */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 50 }}
          className="relative max-w-5xl mx-auto w-full"
        >
          {/* Ambient Glow behind console */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-pink-500/30 rounded-[32px] blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000" />

          {/* Console Container */}
          <div className="relative rounded-2xl overflow-hidden bg-[#050505] border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]">

            {/* UI Header showing 'Research Tabs' in a browser-like feel */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] rounded-lg border border-white/5 text-xs font-medium text-gray-300">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Deep Analysis</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white/5 transition-colors cursor-pointer">
                  <span>Sources</span>
                  <span className="bg-white/10 px-1 rounded text-[10px]">12</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-green-500 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Split View: Request / Analysis */}
            <div className="grid md:grid-cols-[1fr_1.4fr] divide-y md:divide-y-0 md:divide-x divide-white/5 min-h-[400px]">

              {/* Left: Input/Query */}
              <div className="p-6 bg-[#080808]">
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Research Query</label>
                  <div className="text-lg font-medium text-white leading-relaxed">
                    "Analyze the current state of <span className="text-purple-400 border-b border-purple-500/30 pb-0.5">Quantum Computing</span> startups in 2026 vs 2025"
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Configuration</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Breadth</span>
                      </div>
                      <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">WIDE</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">Lookback</span>
                      </div>
                      <span className="text-xs font-mono text-gray-400">12 MONTHS</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                    <div className="w-4 h-4 rounded border border-white/10 flex items-center justify-center bg-white/5">&gt;_</div>
                    <span>Initializing agent swarm...</span>
                  </div>
                </div>
              </div>

              {/* Right: Real-time Output */}
              <div className="p-6 bg-[#050505] relative overflow-hidden">
                {/* Decorative scanline */}
                <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-purple-500/5 to-transparent animate-scan" />

                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Bot className="w-3 h-3" /> Agent Output
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </div>

                <div className="space-y-4 font-mono text-sm">
                  {/* Step 1 */}
                  <div className="flex gap-3 text-green-400/80">
                    <span className="opacity-50 select-none">01</span>
                    <span>Searching "Quantum Computing VC funding 2026"...</span>
                  </div>
                  {/* Step 2 */}
                  <div className="flex gap-3 text-green-400/80">
                    <span className="opacity-50 select-none">02</span>
                    <span>Found <span className="text-white">14 citations</span> from TechCrunch, Nature, PitchBook.</span>
                  </div>

                  {/* Extracted Data Card */}
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 transition-colors hover:border-purple-500/30 group/card">
                    <div className="text-xs text-gray-500 mb-2 group-hover/card:text-purple-400 transition-colors">EXTRACTED INSIGHT</div>
                    <div className="text-gray-300 mb-3">
                      Global funding for quantum startups increased by <span className="text-white font-bold bg-white/10 px-1 rounded">22%</span> in Q1 2026, driven by breakthroughs in error correction.
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Market Trend</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">High Confidence</span>
                    </div>
                  </div>

                  {/* Step 3 - Typing */}
                  <div className="flex gap-3 text-gray-500">
                    <span className="opacity-50 select-none">03</span>
                    <span className="flex items-center gap-1">
                      Synthesizing report <span className="w-1.5 h-4 bg-purple-500 animate-pulse inline-block align-middle ml-1" />
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
)

// Stats Section - Minimal Strip
const StatsSection = () => {
  const stats = [
    { value: '35ms', label: 'Analysis Speed', icon: Zap },
    { value: '100%', label: 'Structured JSON', icon: FileText },
    { value: 'BYOK', label: 'No Rate Limits', icon: Key },
    { value: '40+', label: 'Preset Domains', icon: Globe },
  ];

  return (
    <section className="relative py-12 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-center gap-4 group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-purple-500/10 transition-colors">
                <stat.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-white leading-none mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section - Bento Grid
const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-32 landing-page">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-block rounded-full font-bold px-3 py-1 bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20 text-xs uppercase tracking-wider">
            Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
            Everything your agent needs to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">understand the world.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {/* Card 1: Custom Schemas - Large */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bento-card p-8 flex flex-col justify-between group"
          >
            <div className="bento-card-inner bg-gradient-to-br from-purple-500/10 via-transparent to-transparent" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Custom Schemas</h3>
              <p className="text-gray-400 max-w-md text-lg">
                Stop parsing markdown. Define the exact JSON structure you need, and we'll fill it with real-time data.
              </p>
            </div>

            {/* Visual */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-30 group-hover:opacity-50 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10" />
              <pre className="text-xs text-purple-300 p-8 font-mono">
                {`{\n  "price": "number",\n  "sentiment": "string" \n}`}
              </pre>
            </div>
          </motion.div>

          {/* Card 2: Extraction Mode - Tall */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="md:col-span-1 md:row-span-2 bento-card p-8 flex flex-col relative overflow-hidden group"
          >
            <div className="bento-card-inner bg-gradient-to-b from-blue-500/10 to-transparent" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Extraction Mode</h3>
              <p className="text-gray-400 mb-8">
                Target specific fields from search results. Perfect for arrays of products, prices, or events.
              </p>
            </div>

            {/* Animated List Visual */}
            <div className="mt-auto relative w-full h-64 bg-[#111] rounded-xl border border-white/10 p-4 overflow-hidden">
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 items-center opacity-50 group-hover:opacity-100 transition-opacity" style={{ transitionDelay: `${i * 100}ms` }}>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="h-2 bg-white/10 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card 3: Multi-Query - Standard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="bento-card p-8"
          >
            <div className="bento-card-inner bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Query Compare</h3>
            <p className="text-gray-400">
              Compare multiple topics in a single researched response.
            </p>
          </motion.div>

          {/* Card 4: Webhooks - Standard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            className="bento-card p-8"
          >
            <div className="bento-card-inner bg-gradient-to-br from-pink-500/10 to-transparent" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Webhook Delivery</h3>
            <p className="text-gray-400">
              Async processing? We'll POST the JSON when it's ready.
            </p>
          </motion.div>

          {/* Card 5: BYOK - Wide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            viewport={{ once: true }}
            className="md:col-span-3 bento-card p-8 flex flex-col md:flex-row items-center gap-8"
          >
            <div className="bento-card-inner bg-gradient-to-r from-amber-500/10 via-transparent to-transparent" />
            <div className="flex-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                <Key className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Bring Your Own Keys</h3>
              <p className="text-gray-400 max-w-xl">
                Don't pay markup on LLM tokens. Plug in your standard Gemini, Groq, and Tavily keys for unlimited throughput and direct pricing.
              </p>
            </div>
            <div className="flex gap-4 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500">
              {/* Logos could go here */}
              <div className="px-4 py-2 border border-white/10 rounded-lg bg-black font-mono text-xs text-gray-400">GROQ_API_KEY</div>
              <div className="px-4 py-2 border border-white/10 rounded-lg bg-black font-mono text-xs text-gray-400">TAVILY_API_KEY</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Pricing Section - Premium Cards
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
        '5 Web Search / day',
        '3 Deep Research / day',
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
        '50,000 requests / month',
        '1,000 Web Search / month',
        '50 Deep Research / month',
        'Priority support',
      ],
      cta: 'Get Managed Pro',
      popular: true,
      badge: 'Most Popular',
    },
    {
      name: 'Managed Expert',
      price: '$79',
      period: '/month',
      description: 'For high-volume production apps',
      features: [
        '200,000 requests / month',
        '5,000 Web Search / month',
        '200 Deep Research / month',
        'Priority support',
        'Dedicated account manager',
      ],
      cta: 'Get Managed Expert',
      popular: false,
      badge: 'High Volume',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Tailored for your organization',
      features: [
        'Custom request limits',
        'Unlimited Web Search',
        'Unlimited Deep Research',
        'Dedicated support & SLAs',
        'Custom integrations',
        'On-premise deployment options',
      ],
      cta: 'Contact Sales',
      popular: false,
      badge: 'Custom',
      isEnterprise: true,
    },
  ];

  const byokPlans = [
    {
      name: 'BYOK Starter',
      price: 'Free',
      period: '',
      description: 'Test the engine with your own keys',
      features: [
        '50 requests / day',
        '10 Deep Research / day',
        'Unlimited Web Search',
        'Your Groq & Tavily keys required',
        'Community support',
      ],
      cta: 'Get Started',
      popular: false,
      badge: 'New',
    },
    {
      name: 'BYOK Pro',
      price: '$5',
      period: '/month',
      description: 'Production scale with your own keys.',
      features: [
        'Unlimited requests (10 req/sec)',
        'Unlimited Web Search',
        'Unlimited Deep Research',
        '500 Agentic / month',
        'Your Groq & Tavily keys',
        'Premium support',
      ],
      cta: 'Go Pro',
      popular: true,
      badge: 'Best Value',
      footnote: 'Agentic mode capped at 500/month for Vercel protection.',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Tailored for your organization',
      features: [
        'Custom request limits',
        'Unlimited Web Search',
        'Unlimited Deep Research',
        'Dedicated support & SLAs',
        'Custom integrations',
        'Your own API keys',
      ],
      cta: 'Contact Sales',
      popular: false,
      badge: 'Custom',
      isEnterprise: true,
    },
  ];

  const activePlans = activeTab === 'managed' ? managedPlans : byokPlans;

  return (
    <section id="pricing" className="relative py-32 landing-page">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-xs font-medium text-green-300 mb-6">
            <Key className="w-3 h-3" />
            <span>PRICING</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Pay for the API, not the tokens.
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Choose <strong>Managed</strong> for zero-config, or <strong>BYOK</strong> to bring your own API keys and pay spot prices directly to providers.
          </p>
        </motion.div>

        {/* Custom Tab Switcher */}
        <div className="flex justify-center mb-16 cursor-default">
          <div className="p-1.5 rounded-2xl bg-white/5 border border-white/10 flex gap-2 relative">
            <div
              className={`absolute inset-y-1.5 rounded-xl transition-all duration-300 ease-out bg-white/10 ${activeTab === 'managed' ? 'left-1.5 right-[calc(50%+4px)]' : 'left-[calc(50%+4px)] right-1.5'}`}
            />
            <button
              onClick={() => setActiveTab('managed')}
              className={`relative z-10 px-6 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'managed' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Managed
            </button>
            <button
              onClick={() => setActiveTab('byok')}
              className={`relative z-10 px-6 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'byok' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              BYOK
            </button>
          </div>
        </div>

        <div className={`grid gap-8 mx-auto ${activeTab === 'managed' ? 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl' : 'md:grid-cols-3 max-w-5xl'}`}>
          {activePlans.map((plan, index) => {
            const isEnterprise = 'isEnterprise' in plan && plan.isEnterprise;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={`${activeTab}-${plan.name}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2 group
                   ${isPopular
                    ? 'bg-[#0A0A0A] border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]'
                    : 'bg-[#0A0A0A] border-white/10 hover:border-white/20'
                  }
                `}
              >
                {/* Glow for popular */}
                {isPopular && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-50 rounded-3xl pointer-events-none" />
                )}

                {/* Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg
                        ${isPopular ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 border border-white/10'}
                     `}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6 relative z-10">
                  <h3 className="text-gray-400 font-medium mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-gray-500 text-sm font-medium">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 min-h-[40px]">{plan.description}</p>
                </div>

                <div className="flex-grow relative z-10 mb-8">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm text-gray-300">
                        {feature.startsWith('❌') ? (
                          <XCircle className="w-5 h-5 text-gray-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                        )}
                        <span className={feature.startsWith('❌') ? 'text-gray-600' : ''}>
                          {feature.replace('❌ ', '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative z-10 mt-auto">
                  {isEnterprise ? (
                    <a href="mailto:support@unforgeapi.com" className="block w-full py-4 rounded-xl border border-white/10 text-center font-bold text-white hover:bg-white/5 transition-colors">
                      {plan.cta}
                    </a>
                  ) : (
                    <Link href="/signup" className={`block w-full py-4 rounded-xl text-center font-bold transition-all shadow-lg
                         ${isPopular ? 'bg-white text-black hover:bg-gray-200 button-glow' : 'bg-white/10 text-white hover:bg-white/20'}
                      `}>
                      {plan.cta}
                    </Link>
                  )}
                  {'footnote' in plan && (plan as any).footnote && (
                    <p className="text-[10px] text-gray-600 text-center mt-3 mx-auto max-w-[200px] leading-tight">
                      {(plan as any).footnote}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          All plans include our <span className="text-gray-300">universal router</span> and <span className="text-gray-300">99.9% uptime SLA</span>.
        </div>
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
      question: 'How fast is Deep Research compared to alternatives?',
      answer: 'Deep Research returns comprehensive, cited reports in 30-40 seconds. Traditional research APIs take 2-5 minutes for similar depth. Our multi-stage pipeline parallelizes web fetching and AI analysis to deliver speed without sacrificing quality.',
    },
    {
      question: 'How do I migrate from my current setup?',
      answer: "It's a single endpoint change. Replace your current LLM API call with a POST to /v1/chat. Add an optional 'context' field with any local data you want prioritized. That's it - the router handles everything else.",
    },
  ];

  return (
    <section id="faq" className="relative py-32">
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
        }}
      />
      <div className="max-w-3xl mx-auto px-6 relative z-10">
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
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
        }}
      />
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl"
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
              className="group flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
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
    <footer className="relative border-t border-white/10 py-12">
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
        }}
      />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="font-bold text-white">UnforgeAPI</span>
          </div>

          <div className="flex items-center gap-8">
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
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
    <main className="min-h-screen bg-[#050505] text-white">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <NewDeepResearchSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
