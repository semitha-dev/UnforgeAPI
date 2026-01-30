'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
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
import { KnowledgeLayerSection } from './components/KnowledgeLayerSection';
import { InfrastructureSection } from './components/InfrastructureSection';
import { Navigation } from './components/Navigation';

// Hero Section - Connected Grid Mix
const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // 1. Initial State
      gsap.set(badgeRef.current, { opacity: 0, y: 20 });
      gsap.set(headingRef.current, { opacity: 0, y: 30 });
      gsap.set(line1Ref.current, { width: 0, opacity: 1 });
      gsap.set(textRef.current, { width: 0, opacity: 1 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 20 });
      gsap.set(buttonsRef.current, { opacity: 0, y: 20 });
      gsap.set(consoleRef.current, { opacity: 0, scale: 0.9, y: 50 });

      // Hide code lines initially
      const codeLines = codeContainerRef.current?.querySelectorAll('.code-line');
      if (codeLines) {
        gsap.set(codeLines, { opacity: 0, x: -20 });
      }

      // 2. Entrance Sequence
      tl.to(badgeRef.current, { opacity: 1, y: 0, duration: 0.8 })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 1 }, "-=0.6")

        // Reveals cursor just before typing
        .set(line1Ref.current, { borderRightColor: "white", visibility: "visible" })
        // Typewriter Effect Part 1: "Knowledge for"
        .fromTo(line1Ref.current,
          { width: "0%" },
          { width: "auto", duration: 1.2, ease: "steps(13)" },
          "-=0.5"
        )
        // Remove cursor from line 1
        .set(line1Ref.current, { borderRightColor: "transparent" })

        // Reveals cursor just before typing
        .set(textRef.current, { borderRightColor: "#c084fc", visibility: "visible" }) // purple-400
        // Typewriter Effect Part 2: "AI Agents"
        .fromTo(textRef.current,
          { width: "0%" },
          { width: "auto", duration: 1.0, ease: "steps(9)" },
        )

        .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.8 }, "-=0.5")
        .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")

        // Elastic Console Entrance
        .to(consoleRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.5,
          ease: "elastic.out(1, 0.5)"
        }, "-=0.4")

        // Sequential Code Typing
        .to(codeLines || [], {
          opacity: 1,
          x: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out"
        }, "-=1.0");

      // 3. 3D Tilt Effect on Mouse Move
      const handleMouseMove = (e: MouseEvent) => {
        if (!consoleRef.current) return;
        const { left, top, width, height } = consoleRef.current.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;

        gsap.to(consoleRef.current, {
          rotationY: x * 5, // Rotate Y based on X position
          rotationX: -y * 5, // Rotate X based on Y position (inverted)
          transformPerspective: 1000,
          ease: "power1.out",
          duration: 0.5
        });
      };

      const handleMouseLeave = () => {
        gsap.to(consoleRef.current, {
          rotationY: 0,
          rotationX: 0,
          ease: "power2.out",
          duration: 0.8
        });
      };

      heroRef.current?.addEventListener('mousemove', handleMouseMove);
      heroRef.current?.addEventListener('mouseleave', handleMouseLeave);

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative flex flex-col items-center pt-24 pb-20 overflow-hidden min-h-[90vh] landing-page perspective-[2000px]">
      {/* Background Elements - Specific to Hero */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Additional Hero Glow - Stronger than global */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 blur-[120px] rounded-full" />

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
          <div>
            {/* Badge */}
            <div ref={badgeRef} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors cursor-default opacity-0">
              <span className="flex relative h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-semibold tracking-wide text-gray-300">RESEARCH API V4 IS LIVE</span>
            </div>

            {/* Headline */}
            <h1 ref={headingRef} className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[0.95] drop-shadow-2xl opacity-0">
              <div className="inline-block overflow-hidden align-bottom">
                <span ref={line1Ref} className="block whitespace-nowrap overflow-hidden border-r-4 border-transparent pr-2 w-0 invisible">
                  Knowledge for
                </span>
              </div>
              <br />
              <div className="inline-block overflow-hidden align-bottom">
                <span ref={textRef} className="block whitespace-nowrap overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 border-r-4 border-transparent pr-2 w-0 invisible">
                  AI Agents
                </span>
              </div>
            </h1>

            {/* Subtitle */}
            <p ref={subtitleRef} className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10 font-medium opacity-0">
              Give your LLMs real-time access to the entire web. <br className="hidden sm:block" />
              <span className="text-white decoration-purple-500/30 underline decoration-2 underline-offset-4">Structured JSON</span> output in under 30 seconds.
            </p>

            {/* CTAs */}
            <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 opacity-0">
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
          </div>
        </div>

        {/* Floating Research Console */}
        <div
          ref={consoleRef}
          className="relative max-w-5xl mx-auto w-full opacity-0 [transform-style:preserve-3d]"
        >
          {/* Ambient Glow behind console */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-pink-500/30 rounded-[32px] blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000 -z-10" />

          {/* Console Container - Code vs JSON */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0D0D0D] border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] font-mono text-sm leading-relaxed backdrop-blur-xl">

            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                <span className="text-gray-300">example.ts</span>
                <span>response.json</span>
              </div>
            </div>

            <div ref={codeContainerRef} className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-[#0D0D0D]">

              {/* Left: The Request Code */}
              <div className="p-6 overflow-x-auto">
                <div className="code-line text-gray-500 mb-2 select-none">// 1. Define your schema</div>
                <div className="code-line text-purple-400">const<span className="text-white"> schema </span><span className="text-blue-400">=</span><span className="text-white"> {'{'}</span></div>
                <div className="code-line pl-4 text-white">company_name<span className="text-blue-400">:</span> <span className="text-green-400">"string"</span>,</div>
                <div className="code-line pl-4 text-white">revenue_growth<span className="text-blue-400">:</span> <span className="text-green-400">"string"</span>,</div>
                <div className="code-line pl-4 text-white">key_risks<span className="text-blue-400">:</span> [<span className="text-green-400">"string"</span>]</div>
                <div className="code-line text-white">{'}'}</div>

                <div className="code-line text-gray-500 mt-6 mb-2 select-none">// 2. Call UnforgeAPI</div>
                <div className="code-line text-blue-400">const<span className="text-white"> res </span><span className="text-blue-400">=</span><span className="text-blue-400"> await</span><span className="text-yellow-400"> fetch</span><span className="text-white">('https://www.unforgeapi.com/api/v1/deep-research', {'{'}</span></div>
                <div className="code-line pl-4 text-white">method<span className="text-blue-400">:</span> <span className="text-green-400">'POST'</span>,</div>
                <div className="code-line pl-4 text-white">headers<span className="text-blue-400">:</span> {'{'} <span className="text-green-400">'Authorization'</span><span className="text-blue-400">:</span> <span className="text-green-400">'Bearer uf_your_api_key'</span> {'}'},</div>
                <div className="code-line pl-4 text-white">body<span className="text-blue-400">:</span><span className="text-yellow-400"> JSON</span><span className="text-white">.</span><span className="text-yellow-400">stringify</span><span className="text-white">({'{'}</span></div>
                <div className="code-line pl-8 text-white">query<span className="text-blue-400">:</span> <span className="text-green-400">"Microsoft Q3 2026 Results"</span>,</div>
                <div className="code-line pl-8 text-white">mode<span className="text-blue-400">:</span> <span className="text-green-400">'schema'</span>,</div>
                <div className="code-line pl-8 text-white">preset<span className="text-blue-400">:</span> <span className="text-green-400">'stocks'</span>,</div>
                <div className="code-line pl-8 text-white">schema</div>
                <div className="code-line pl-4 text-white">{'}'})</div>
                <div className="code-line text-white">{'}'})</div>
              </div>

              {/* Right: The JSON Output */}
              <div className="p-6 bg-[#0A0A0A] relative overflow-hidden group">
                <div className="absolute top-4 right-4 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  200 OK
                </div>

                <div className="code-line text-gray-500 select-none mb-2">// Response (~30s)</div>
                <div className="code-line text-purple-400">{'{'}</div>
                <div className="code-line pl-4 text-white">"company_name"<span className="text-blue-400">:</span> <span className="text-green-400">"Microsoft Corporation"</span>,</div>
                <div className="code-line pl-4 text-white">"revenue_growth"<span className="text-blue-400">:</span> <span className="text-green-400">"+17% YoY"</span>,</div>
                <div className="code-line pl-4 text-white">"key_risks"<span className="text-blue-400">:</span> [</div>
                <div className="code-line pl-8 text-green-400">"AI regulation (EU AI Act)",</div>
                <div className="code-line pl-8 text-green-400">"Data center capacity constraints"</div>
                <div className="code-line pl-4 text-white">],</div>
                <div className="code-line pl-4 text-white">"sources"<span className="text-blue-400">:</span> [</div>
                <div className="code-line pl-8 text-white">{'{'} <span className="text-green-400">"title"</span><span className="text-blue-400">:</span> <span className="text-green-400">"Microsoft Q3 2026"</span>, <span className="text-green-400">"url"</span><span className="text-blue-400">:</span> <span className="text-green-400">"..."</span> {'}'}</div>
                <div className="code-line pl-4 text-white">],</div>
                <div className="code-line pl-4 text-white">"meta"<span className="text-blue-400">:</span> {'{'} <span className="text-green-400">"latency_ms"</span><span className="text-blue-400">:</span> <span className="text-yellow-400">28450</span>, <span className="text-green-400">"preset"</span><span className="text-blue-400">:</span> <span className="text-green-400">"stocks"</span> {'}'}</div>
                <div className="code-line text-purple-400">{'}'}</div>
              </div>

            </div>
          </div>
        </div>

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
    { value: '~30s', label: 'Deep Research', icon: Zap },
    { value: '100%', label: 'Structured JSON', icon: FileText },
    { value: '6', label: 'Domain Presets', icon: Globe },
  ];

  return (
    <section className="relative py-12 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-8">
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

// Comparison Section - UnforgeAPI vs Perplexity vs Firecrawl
const ComparisonSection = () => {
  const features = [
    {
      category: 'Core Function',
      unforge: 'AI research → Structured data',
      unforgeDetail: 'Web research + synthesis + verification',
      perplexity: 'Search + Answer',
      perplexityDetail: 'Real-time search with conversational answers',
      firecrawl: 'Web scraping',
      firecrawlDetail: 'Extract clean data from websites',
    },
    {
      category: 'Pricing (Entry)',
      unforge: '$5/mo unlimited',
      unforgeDetail: 'BYOK model - bring your own API keys',
      perplexity: '$5 per 1,000 requests',
      perplexityDetail: 'Pay-per-use API pricing',
      firecrawl: '$16/mo for 3,000 pages',
      firecrawlDetail: 'Subscription-based page credits',
    },
    {
      category: 'Custom JSON Schemas',
      unforge: true,
      unforgeDetail: 'Define any JSON structure you want',
      perplexity: false,
      perplexityDetail: 'Fixed response format',
      firecrawl: false,
      firecrawlDetail: 'Returns raw HTML/markdown',
    },
    {
      category: 'Agentic Verification',
      unforge: true,
      unforgeDetail: 'Multi-iteration fact-checking loops',
      perplexity: false,
      perplexityDetail: 'Single-pass answers',
      firecrawl: false,
      firecrawlDetail: 'No verification - just scraping',
    },
    {
      category: 'Best For',
      unforge: 'AI agents & automation',
      unforgeDetail: 'Structured research at scale',
      perplexity: 'Human Q&A',
      perplexityDetail: 'Conversational search experience',
      firecrawl: 'Data extraction',
      firecrawlDetail: 'Scraping websites for raw content',
    },
    {
      category: 'Output Format',
      unforge: 'Custom JSON + Markdown',
      unforgeDetail: 'You define the structure',
      perplexity: 'Markdown text',
      perplexityDetail: 'Natural language responses',
      firecrawl: 'HTML/Markdown',
      firecrawlDetail: 'Raw web content',
    },
    {
      category: 'Response Time',
      unforge: '30-40 seconds',
      unforgeDetail: 'Deep research with verification',
      perplexity: '2-5 seconds',
      perplexityDetail: 'Fast conversational answers',
      firecrawl: '1-3 seconds',
      firecrawlDetail: 'Quick scraping',
    },
  ];

  return (
    <section id="comparison" className="relative py-32 landing-page">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-medium text-purple-300 mb-6">
            <BarChart3 className="w-3 h-3" />
            <span>COMPARISON</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            How we compare
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Different tools for different needs. Here's how UnforgeAPI stacks up against Perplexity and Firecrawl.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <div className="min-w-[800px] bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-6 bg-white/5 border-b border-white/10">
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Feature</div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-300 mb-1">UnforgeAPI</div>
                <div className="text-xs text-gray-500">Research API</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-300 mb-1">Perplexity</div>
                <div className="text-xs text-gray-500">Search Engine</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-300 mb-1">Firecrawl</div>
                <div className="text-xs text-gray-500">Web Scraper</div>
              </div>
            </div>

            {/* Table Rows */}
            {features.map((feature, index) => (
              <div
                key={index}
                className={`grid grid-cols-4 gap-4 p-6 ${index !== features.length - 1 ? 'border-b border-white/5' : ''
                  } hover:bg-white/5 transition-colors group`}
              >
                <div className="text-sm font-semibold text-white">{feature.category}</div>

                {/* UnforgeAPI Column */}
                <div className="text-center">
                  {typeof feature.unforge === 'boolean' ? (
                    feature.unforge ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-purple-400" />
                        <span className="text-xs text-gray-500">{feature.unforgeDetail}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600">{feature.unforgeDetail}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium text-purple-300">{feature.unforge}</span>
                      <span className="text-xs text-gray-500">{feature.unforgeDetail}</span>
                    </div>
                  )}
                </div>

                {/* Perplexity Column */}
                <div className="text-center">
                  {typeof feature.perplexity === 'boolean' ? (
                    feature.perplexity ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-gray-500">{feature.perplexityDetail}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600">{feature.perplexityDetail}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium text-blue-300">{feature.perplexity}</span>
                      <span className="text-xs text-gray-500">{feature.perplexityDetail}</span>
                    </div>
                  )}
                </div>

                {/* Firecrawl Column */}
                <div className="text-center">
                  {typeof feature.firecrawl === 'boolean' ? (
                    feature.firecrawl ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-orange-400" />
                        <span className="text-xs text-gray-500">{feature.firecrawlDetail}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <XCircle className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600">{feature.firecrawlDetail}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-medium text-orange-300">{feature.firecrawl}</span>
                      <span className="text-xs text-gray-500">{feature.firecrawlDetail}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Use Case Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-12"
        >
          {/* UnforgeAPI Use Case */}
          <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Choose UnforgeAPI if...</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>You need <strong>structured JSON output</strong> for AI agents</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>You want <strong>fact-checked research</strong> with verification loops</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>You're building <strong>automation workflows</strong> that need reliable data</span>
              </li>
            </ul>
          </div>

          {/* Perplexity Use Case */}
          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Choose Perplexity if...</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>You need <strong>fast conversational answers</strong> for humans</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>You want a <strong>search engine alternative</strong> with citations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>You don't need custom <strong>output formatting</strong></span>
              </li>
            </ul>
          </div>

          {/* Firecrawl Use Case */}
          <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Choose Firecrawl if...</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>You need to <strong>scrape websites</strong> for raw content</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>You want <strong>clean HTML/markdown</strong> without ads</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>You don't need AI <strong>synthesis or analysis</strong></span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            Try UnforgeAPI Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
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
  const managedPlans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Perfect for testing',
      features: [
        '10 deep research / month',
        'Community support',
      ],
      cta: 'Start Free',
      popular: false,
      badge: null,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For growing teams',
      features: [
        '100 deep research / month',
        'Priority support',
      ],
      cta: 'Get Pro',
      popular: true,
      badge: 'Most Popular',
    },
    {
      name: 'Expert',
      price: '$200',
      period: '/month',
      description: 'For high-volume production',
      features: [
        '800 deep research / month',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Get Expert',
      popular: false,
      badge: null,
    },
  ];

  const byokPlans: any[] = [];


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
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Deep research API with 3-iteration agentic loop. All tiers fully managed - we handle the AI provider costs.
          </p>
        </motion.div>

        <div className="grid gap-6 mx-auto md:grid-cols-2 lg:grid-cols-3 max-w-5xl">
          {managedPlans.map((plan, index) => {
            const isEnterprise = 'isEnterprise' in plan && plan.isEnterprise;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.name}
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
      answer: 'All tiers are fully managed - we handle all AI provider costs. You simply pay for the number of deep research requests per month based on your chosen tier.',
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
    <main className="min-h-screen bg-[#050505] selection:bg-purple-500/30 text-white font-sans overflow-hidden relative">
      <Navigation />

      {/* Global Background Layer - Fixed to viewport for consistent premium feel */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Main Connected Grid - Subtle everywhere */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }}
        />

        {/* Ambient Glows - Fixed positions that stay as you scroll */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10">
        <HeroSection />

        <StatsSection />

        {/* Section Divider - Glow */}
        <div className="relative h-px w-full max-w-7xl mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent my-0" />

        <div className="relative">
          {/* Deep Research Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-blue-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
          <NewDeepResearchSection />
        </div>

        <div className="relative">
          <KnowledgeLayerSection />
        </div>

        <div className="relative">
          <InfrastructureSection />
        </div>





        <div className="relative">
          {/* Pricing Section Glow */}
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
          <PricingSection />
        </div>

        <FAQSection />
        <CTASection />
        <Footer />
      </div>
    </main>
  );
}
