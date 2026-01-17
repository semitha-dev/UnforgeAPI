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
  Menu,
  X,
  Sparkles,
  Bot,
  Gauge,
  Zap,
  CheckCircle
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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">UnforgeAPI</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <a href="#deep-research" onClick={(e) => scrollToSection(e, 'deep-research')} className="hover:text-white transition-colors cursor-pointer">How It Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition-colors cursor-pointer">Features</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-white transition-colors cursor-pointer">Router</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition-colors cursor-pointer">Pricing</a>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/hub/blog" className="hover:text-white transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/signin" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-white hover:bg-gray-100 text-black text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              Get Started Free
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#050505]/95 border-t border-white/10"
          >
            <div className="px-6 py-4 space-y-4">
              <a href="#deep-research" onClick={(e) => scrollToSection(e, 'deep-research')} className="block text-gray-400 hover:text-white cursor-pointer">How It Works</a>
              <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="block text-gray-400 hover:text-white cursor-pointer">Features</a>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="block text-gray-400 hover:text-white cursor-pointer">Router</a>
              <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="block text-gray-400 hover:text-white cursor-pointer">Pricing</a>
              <Link href="/docs" className="block text-gray-400 hover:text-white">Docs</Link>
              <Link href="/hub/blog" className="block text-gray-400 hover:text-white">Blog</Link>
              <Link href="/signin" className="block text-gray-400 hover:text-white">Sign In</Link>
              <Link href="/signup" className="block py-2 text-center bg-white text-black rounded-lg font-bold">
                Get Started Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// Hero Section - New Two-Column Design
const HeroSection = () => {
  return (
    <section className="relative flex items-center pt-20 overflow-hidden min-h-screen">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)'
        }}
      />
      
      {/* Gradient Blurs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-0 w-full py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12 items-center">
          {/* Left Column - Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 text-center lg:text-left lg:pl-4"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-300 mx-auto lg:mx-0 shadow-lg shadow-black/50">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              The Research Layer for AI Agents
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white">
              Deep Research API <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                Built for Machines
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Real-time web grounding. 30-40 second deep analysis.{' '}
              <strong className="text-white">Perfectly structured JSON.</strong>{' '}
              The research endpoint your AI agents deserve.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="group inline-flex justify-center items-center gap-2 bg-white hover:bg-gray-200 text-black px-8 py-3.5 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                Get Your API Key
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => document.getElementById('deep-research')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex justify-center items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3.5 rounded-lg font-medium transition-all backdrop-blur-sm cursor-pointer"
              >
                <Code className="w-4 h-4 text-gray-400" />
                See How It Works
              </button>
            </div>

            {/* Built For */}
            <div className="pt-10 border-t border-white/5">
              <p className="text-xs font-mono uppercase text-gray-500 mb-5 tracking-wider">Built for</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">AI Agents</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Code className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Developers</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Startups</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-gray-300">Production Apps</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Code Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 lg:mt-0 lg:pl-8 lg:pr-4"
          >
            <div className="relative group">
              {/* Gradient Border Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-2xl">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500/80 animate-pulse" />
                  POST /v1/deep-research
                </div>
              </div>

              {/* Code Content */}
              <div className="p-6 overflow-x-auto font-mono text-sm leading-relaxed bg-[#0A0A0A]">
                <pre className="text-gray-400">
                  <span className="text-gray-600">{'// Extract exactly what you need. Not essays.'}</span>{'\n'}
                  <span className="text-purple-400">const</span> <span className="text-blue-400">response</span> = <span className="text-purple-400">await</span> <span className="text-yellow-300">fetch</span>(<span className="text-green-400">&apos;/api/v1/deep-research&apos;</span>, {'{\n'}
                  {'  '}<span className="text-blue-300">method</span>: <span className="text-green-400">&apos;POST&apos;</span>,{'\n'}
                  {'  '}<span className="text-blue-300">headers</span>: {'{ \n'}
                  {'    '}<span className="text-green-400">&apos;Authorization&apos;</span>: <span className="text-green-400">`Bearer <span className="text-yellow-300">{'${API_KEY}'}</span>`</span>{' \n'}
                  {'  }'},{'{\n'}
                  {'  '}<span className="text-blue-300">body</span>: <span className="text-yellow-300">JSON</span>.<span className="text-yellow-300">stringify</span>({'{\n'}
                  {'    '}<span className="text-blue-300">query</span>: <span className="text-green-400">&quot;Tesla vs Rivian 2026&quot;</span>,{'\n'}
                  {'    '}<span className="text-blue-300">mode</span>: <span className="text-green-400">&quot;extract&quot;</span>,{'\n'}
                  {'    '}<span className="text-blue-300">extract</span>: [{'\n'}
                  {'      '}<span className="text-green-400">&quot;market_cap&quot;</span>,{' \n'}
                  {'      '}<span className="text-green-400">&quot;revenue&quot;</span>,{' \n'}
                  {'      '}<span className="text-green-400">&quot;growth_rate&quot;</span>{'\n'}
                  {'    '}]{'\n'}
                  {'  }'}){'\n'}
                  {'}'});{'\n'}
                  <span className="text-gray-600">{'// Response Time: 340ms'}</span>{'\n'}
                  <span className="text-purple-400">console</span>.<span className="text-yellow-300">log</span>(<span className="text-purple-400">await</span> <span className="text-blue-400">response</span>.<span className="text-yellow-300">json</span>());
                </pre>

                {/* Output Preview */}
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Output Preview</div>
                  <pre className="text-green-400/90">
{`{
  "market_cap": {
    "Tesla": "850B",
    "Rivian": "14B"
  },
  "status": "success"
}`}
                  </pre>
                </div>
              </div>
            </div>

              {/* Floating Badge */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="absolute -right-4 top-20 bg-[#151515] border border-white/10 rounded-lg p-3 shadow-xl hidden lg:block shadow-black/50"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-200 font-mono">Valid JSON</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Stats Section
const StatsSection = () => {
  const stats = [
    { value: '30-40s', label: 'Deep Analysis', icon: Clock },
    { value: 'JSON', label: 'Structured Output', icon: FileText },
    { value: 'BYOK', label: 'Bring Your Keys', icon: Key },
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
              <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
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
      icon: FileText,
      title: 'Custom Schemas',
      description: 'Define your own JSON schema. Get exactly the structure you need — prices, dates, comparisons, whatever.',
      gradient: 'from-purple-500 to-violet-500',
    },
    {
      icon: Search,
      title: 'Data Extraction Mode',
      description: 'Extract specific fields from web results. Get clean arrays of prices, features, or any structured data.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BarChart3,
      title: 'Multi-Query Compare',
      description: 'Compare multiple topics in one call. Perfect for competitive analysis and product comparisons.',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      icon: Globe,
      title: 'Domain Presets',
      description: 'Optimized source lists for crypto, stocks, tech, academic, news. Better results, less noise.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Zap,
      title: 'Webhook Delivery',
      description: 'Fire and forget. Get results POSTed to your endpoint when research completes.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Key,
      title: 'BYOK Support',
      description: 'Bring your own Gemini, Groq, and Tavily keys for unlimited scaling with zero markup.',
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
            Research API.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your Schema.
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Define exactly what data you need. Deep Research v4 returns structured JSON that slots directly into your pipeline.
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
              className="group p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-cyan-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">v4: Custom Schemas + Extraction</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            How{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Deep Research
            </span>
            {' '}Works
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Multi-stage AI pipeline optimized for speed and accuracy.{' '}
            <span className="text-white">Web search → AI analysis → Structured JSON output.</span>
          </p>
        </motion.div>

        {/* Architecture Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            {/* Architecture Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-gray-400 font-mono">Deep Research Pipeline</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">~30-40 seconds</span>
            </div>

            {/* Architecture Flow */}
            <div className="p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Step 1: Query */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">1. Search</div>
                  <div className="text-xs text-gray-500">Fetches 12+ web sources</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 2: Extract */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                    <Cpu className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">2. Reason</div>
                  <div className="text-xs text-gray-500">AI extracts key insights</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 3: Write */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">3. Render</div>
                  <div className="text-xs text-gray-500">Lightning-fast report writing</div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-600">
                  <ArrowRight className="w-6 h-6" />
                </div>

                {/* Step 4: Output */}
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-medium text-white mb-1">4. Report</div>
                  <div className="text-xs text-gray-500">Structured JSON with citations</div>
                </div>
              </div>

              {/* Key Insight */}
              <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-center text-sm text-gray-300">
                  <span className="text-purple-400 font-medium">Built for developers, not end users.</span>{' '}
                  <span className="text-white font-medium">Custom schemas. Extraction mode. Webhook delivery. JSON, not Markdown.</span>
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
            className="p-6 bg-white/5 border border-white/10 rounded-xl"
          >
            <Gauge className="w-10 h-10 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast Research</h3>
            <p className="text-gray-400 text-sm">
              Get comprehensive research reports in 30-40 seconds. Optimized pipeline delivers speed without sacrificing depth.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white/5 border border-white/10 rounded-xl"
          >
            <Bot className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Built for Machines</h3>
            <p className="text-gray-400 text-sm">
              Deterministic JSON output with typed fields. No parsing Markdown. Slots directly into your agent pipeline.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-white/5 border border-white/10 rounded-xl"
          >
            <Key className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">BYOK = No Limits</h3>
            <p className="text-gray-400 text-sm">
              Bring your own Gemini, Groq, and Tavily keys. No rate limits from us. Scale with your own quotas.
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
          <div className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-500 ml-2">Schema Mode — Define Your Output</span>
            </div>
            <pre className="p-6 text-left overflow-x-auto">
              <code className="text-sm">
                <span className="text-gray-500">{'// Define exactly the structure you need'}</span>{'\n'}
                <span className="text-purple-400">const</span> <span className="text-white">result</span> <span className="text-gray-400">=</span> <span className="text-purple-400">await</span> <span className="text-violet-400">fetch</span><span className="text-gray-400">(</span><span className="text-green-400">&apos;/api/v1/deep-research&apos;</span><span className="text-gray-400">,</span> <span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">  method</span><span className="text-gray-400">:</span> <span className="text-green-400">&apos;POST&apos;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">  body</span><span className="text-gray-400">:</span> <span className="text-violet-400">JSON</span><span className="text-gray-400">.</span><span className="text-violet-400">stringify</span><span className="text-gray-400">(</span><span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">    query</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;Bitcoin price analysis&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">    mode</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;schema&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">    preset</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;crypto&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">    schema</span><span className="text-gray-400">:</span> <span className="text-gray-400">{'{'}</span>{'\n'}
                <span className="text-white">      current_price</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;number&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">      weekly_change</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;string&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">      sentiment</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;bullish | bearish | neutral&quot;</span><span className="text-gray-400">,</span>{'\n'}
                <span className="text-white">      key_events</span><span className="text-gray-400">:</span> <span className="text-green-400">&quot;string[]&quot;</span>{'\n'}
                <span className="text-gray-400">    {'}'}</span>{'\n'}
                <span className="text-gray-400">  {'})'}</span>{'\n'}
                <span className="text-gray-400">{'})'}</span>{'\n\n'}
                <span className="text-gray-500">{'// → Returns your exact schema, filled with real data'}</span>
              </code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// How It Works Section - Smart Router
const HowItWorksSection = () => {
  const steps = [
    {
      step: '01',
      title: 'Send Your Request',
      description: 'POST to /v1/chat with your query and optional context. The router handles everything.',
      code: `fetch('/v1/chat', {
  body: JSON.stringify({
    query: "What's in my document?",
    context: "Contract text..."
  })
})`,
    },
    {
      step: '02',
      title: 'Intent Classification',
      description: 'Our lightweight classifier determines if web search is needed — or if the answer exists in your context.',
      code: `// Router Decision
{
  "intent": "CONTEXT",
  "confidence": 0.95,
  "reason": "Answerable from provided data"
}`,
    },
    {
      step: '03',
      title: 'Smart Execution',
      description: 'CHAT for casual queries (cheap). CONTEXT for document Q&A (no search). RESEARCH for web data.',
      code: `// Response
{
  "answer": "Based on your document...",
  "meta": {
    "routed_to": "CONTEXT",
    "search_skipped": true
  }
}`,
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
            <Cpu className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-400">Also Available</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Smart Router API
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Lightweight intent classification for simpler queries. Skip web search when you don&apos;t need it.
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
                <div className="text-purple-400 font-mono text-sm mb-2">Step {item.step}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
              <div className="flex-1 w-full">
                <div className="bg-[#0A0A0A]/80 border border-white/10 rounded-xl overflow-hidden">
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
        'Unlimited Chat & Context',
        '1,000 Web Search / month',
        '50 Deep Research / month',
        'Priority support',
      ],
      cta: 'Get Started',
      popular: true,
      badge: 'Most Popular',
    },
    {
      name: 'Managed Expert',
      price: '$79',
      period: '/month',
      description: 'For high-volume production apps',
      features: [
        'Unlimited Chat & Context',
        '5,000 Web Search / month',
        '200 Deep Research / month',
        'Priority support',
        'Dedicated account manager',
      ],
      cta: 'Go Expert',
      popular: false,
      badge: 'High Volume',
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
        '5 Deep Research / day',
        'Web Search enabled',
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
      description: 'Production scale. Fair use limits.',
      features: [
        'Unlimited requests*',
        'Unlimited Web Search',
        'Unlimited Deep Research',
        'Your Groq & Tavily keys',
        'Premium support',
      ],
      cta: 'Go Unlimited',
      popular: true,
      badge: 'Best Value',
      footnote: '*Subject to platform fair use policy to prevent abuse.',
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
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1.5">
            <button
              onClick={() => setActiveTab('managed')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'managed'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
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
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
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
              <span className="text-purple-400 font-medium">Zero configuration required.</span>{' '}
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
        <div className={`grid gap-8 mx-auto ${
          activeTab === 'managed' ? 'md:grid-cols-3 max-w-7xl' : 'md:grid-cols-2 max-w-4xl'
        }`}>
          {activePlans.map((plan, index) => (
            <motion.div
              key={`${activeTab}-${plan.name}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-xl border flex flex-col ${
                plan.popular
                  ? activeTab === 'managed'
                    ? 'bg-gradient-to-b from-purple-500/20 to-pink-500/20 border-purple-500/50'
                    : 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border-amber-500/50'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`px-4 py-1 text-white text-sm font-medium rounded-full ${
                    activeTab === 'managed'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
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
              
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => {
                  const isDisabled = feature.startsWith('❌');
                  const displayText = isDisabled ? feature.replace('❌ ', '') : feature;
                  return (
                    <li key={feature} className={`flex items-start gap-2 text-sm ${isDisabled ? 'text-gray-500' : 'text-gray-300'}`}>
                      {!isDisabled && (
                        <Check className={`w-5 h-5 flex-shrink-0 ${
                          activeTab === 'managed' ? 'text-purple-400' : 'text-amber-400'
                        }`} />
                      )}
                      {isDisabled && (
                        <span className="w-5 h-5 flex-shrink-0 text-gray-500">✕</span>
                      )}
                      {displayText}
                    </li>
                  );
                })}
              </ul>

              {'footnote' in plan && (plan as { footnote?: string }).footnote && (
                <p className="text-[10px] text-gray-500 mb-4 -mt-4">{(plan as { footnote?: string }).footnote}</p>
              )}

              <Link
                href="/signup"
                className={`block w-full py-3 text-center font-medium rounded-lg transition-colors mt-auto ${
                  plan.popular
                    ? activeTab === 'managed'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
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
    <footer className="border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="font-bold text-white">UnforgeAPI</span>
          </div>
          
          <div className="flex items-center gap-8">
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link>
            <Link href="/hub/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
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
      <DeepResearchSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
