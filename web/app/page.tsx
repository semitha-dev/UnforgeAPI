"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarCheck2,
  BarChart3,
  CloudUpload,
  Sparkles,
  Coins,
  Check,
  Star,
  FileQuestion,
  ChevronDown,
  Leaf,
} from "lucide-react";

/**
 * Unforge Study — Modern Landing (Emerald palette)
 * - Clause-style hero (grid panel, big headline, green underline highlight)
 * - Login + Get Started CTAs
 * - Sections wired from your product overview
 * - Pricing structure + token boosts
 */
export default function UnforgeLanding() {
  return (
    <div className="min-h-screen w-full bg-[#f7f8f7] text-gray-900">
      {/* subtle radial tint */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_-10%,#a7f3d01a,transparent),radial-gradient(50rem_40rem_at_110%_10%,#bbf7d01a,transparent)]" />
      </div>

      <Nav />
      <Hero />
      <FeatureGrid />
    
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

/* ================= NAV ================= */
function Nav() {
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-6xl rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5">
      <div className="mx-auto flex h-14 items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <span className="text-emerald-600">LeafLearning</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" onClick={(e) => handleSmoothScroll(e, "features")} className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" onClick={(e) => handleSmoothScroll(e, "pricing")} className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#faq" onClick={(e) => handleSmoothScroll(e, "faq")} className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/signin" className="rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors">Log in</a>
          <a
            href="/signup"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}

/* ================= HERO ================= */
function Hero() {
  return (
    <section className="relative w-full pt-32 pb-24 overflow-visible">
      {/* Floating cards - Left side */}
      <div className="absolute left-[5%] top-1/2 -translate-y-1/2 hidden xl:block" style={{ zIndex: 1 }}>
        {/* Write an Essay Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="absolute left-0 top-[-180px] z-10"
        >
          <div className="w-48 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="font-semibold text-gray-900 text-sm">Summarize Papers</div>
            <p className="text-xs text-gray-500 mt-1">Generate concise summaries from research papers and PDFs.</p>
          </div>
        </motion.div>

        {/* Plan Credits Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute left-40 top-[-60px] z-10"
        >
          <div className="w-36 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Coins className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400">Study Credits</div>
                <div className="text-sm font-bold text-gray-900">100,000</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SEO Keywords style card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute left-4 top-[80px] z-10"
        >
          <div className="w-52 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <div className="font-semibold text-gray-900 text-sm">Auto Flashcards</div>
            <p className="text-xs text-gray-500 mt-1">Generate flashcards from your notes and study materials.</p>
          </div>
        </motion.div>

        {/* Credits used card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute left-44 top-[220px] z-10"
        >
          <div className="w-40 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400">Credits used this month</div>
                <div className="text-sm font-bold text-gray-900">46,042</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review Responder style card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="absolute left-0 top-[320px] z-10"
        >
          <div className="w-52 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <div className="font-semibold text-gray-900 text-sm">Smart Scheduling</div>
            <p className="text-xs text-gray-500 mt-1">Build personalized study plans around your exam dates.</p>
          </div>
        </motion.div>
      </div>

      {/* Floating cards - Right side */}
      <div className="absolute right-[5%] top-1/2 -translate-y-1/2 hidden xl:block" style={{ zIndex: 1 }}>
        {/* Product Description Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="absolute right-0 top-[-180px] z-10"
        >
          <div className="w-52 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <div className="font-semibold text-gray-900 text-sm">AI Quiz Generator</div>
            <p className="text-xs text-gray-500 mt-1">Create practice quizzes from your uploaded materials.</p>
          </div>
        </motion.div>

        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute right-40 top-[-50px] z-10"
        >
          <div className="w-44 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-3 w-3 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Current Plan</div>
                  <div className="text-sm font-bold text-gray-900">Expert+</div>
                </div>
              </div>
              <button className="text-[10px] text-indigo-600 font-medium">Manage</button>
            </div>
          </div>
        </motion.div>

        {/* Purple floating icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute right-52 top-[60px] z-10"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <CalendarCheck2 className="h-7 w-7 text-white" />
          </div>
        </motion.div>

        {/* LinkedIn Message style card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute right-0 top-[140px] z-10"
        >
          <div className="w-52 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <CloudUpload className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="font-semibold text-gray-900 text-sm">Community Library</div>
            <p className="text-xs text-gray-500 mt-1">Access shared resources from other students worldwide.</p>
          </div>
        </motion.div>

        {/* Total Credits Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="absolute right-44 top-[290px] z-10"
        >
          <div className="w-40 rounded-2xl bg-white/70 backdrop-blur-xl p-3 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Coins className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400">Total Credits</div>
                <div className="text-sm font-bold text-gray-900">10,000</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chart Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="absolute right-0 top-[380px] z-10"
        >
          <div className="w-56 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-xl shadow-gray-200/50 border border-white/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-400">Usage in the last year</span>
              <span className="text-xs font-bold text-gray-900">758</span>
            </div>
            <div className="h-12 flex items-end gap-1">
              {[20, 35, 25, 45, 30, 55, 40, 60, 35, 70, 50, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-indigo-400 to-purple-400 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-gray-400">
              <span>SEP</span>
              <span>OCT</span>
              <span>NOV</span>
              <span>DEC</span>
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
              <span>MAY</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Introducing LeafLearning – Learn more about it
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 text-4xl font-bold leading-tight text-gray-900 md:text-6xl lg:text-7xl"
        >
          Study smarter with AI<br />
          Learn <GradientUnderline>10X faster</GradientUnderline>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-base text-gray-500 md:text-lg max-w-2xl mx-auto"
        >
          LeafLearning is your AI-powered study companion. Summarize papers, generate flashcards,
          create quizzes, and build smart study schedules — all in one place.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
          >
            Get started now
            <ArrowRight className="h-4 w-4" />
          </a>
        
        </motion.div>

        {/* Bottom badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-900">AI Powered</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <span className="text-gray-500">Production-ready study tools</span>
        </motion.div>
      </div>
    </section>
  );
}

function GradientUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute -bottom-2 left-0 h-3 w-full rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500"
      />
    </span>
  );
}

/* ================= FEATURES ================= */
function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center mb-6">
       
      </div>
      <h2 className="text-center text-5xl font-bold md:text-6xl lg:text-7xl max-w-5xl mx-auto leading-tight text-gray-900 mb-6">
        Everything you need to study smarter
      </h2>
      <p className="mx-auto mt-4 max-w-3xl text-center text-gray-600 text-lg leading-relaxed mb-20">
        AI-powered tools to compress knowledge fast, practice deliberately, and track your progress with powerful features designed for students.
      </p>

      {/* Feature Cards - Each as separate section */}
      <div className="space-y-32">
        {/* AI Summarizer with Citations */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              AI Summarizer with Citations
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Summarizes academic papers & articles • Highlights methodology, findings, key points • APA / MLA / Chicago exports + bibliography
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Lightning-fast processing</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Multiple citation formats</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#eef2ff_0%,#faf5ff_50%,#fdf2f8_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-8 left-8 right-8 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-indigo-200/50 border border-white/60"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Document Analysis</div>
                  <div className="text-sm font-semibold text-gray-900">Research Paper.pdf</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
                </div>
                <div className="text-xs text-gray-500">Processing: 75% complete</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute bottom-8 right-8 left-8 bg-white/90 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-purple-200/50 border border-white/60"
            >
              <div className="text-xs text-gray-500 mb-2">Generated Summary</div>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="line-clamp-2">This study examines the effects of...</p>
                <div className="flex items-center gap-2 text-xs text-indigo-600">
                  <Check className="w-4 h-4" />
                  <span>APA Citation Ready</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* AI Flashcard Generator */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6 lg:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-200">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              AI Flashcard Generator
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Convert PDFs or notes into decks • Definitions • MCQ • T/F • Applied • Organize by topic, chapter, difficulty
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Auto-generate from PDFs</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Multiple question types</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block lg:order-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#faf5ff_0%,#fdf2f8_50%,#fff1f2_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-200/50 border border-white/60"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">What is mitosis?</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-sm">
                    Cell division process
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm">
                    Energy production
                  </button>
                </div>
                <div className="text-xs text-gray-500">Card 1 of 24</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* AI Study Planner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
              <CalendarCheck2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              AI Study Planner
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Schedules from subject + exam date • Spaced repetition built‑in • Adapts to progress + feedback
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Smart scheduling</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Adaptive learning</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ecfdf5_0%,#f0fdfa_50%,#ecfeff_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-8 left-8 right-8 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-emerald-200/50 border border-white/60"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">This Week</h4>
                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-3">
                {['Biology Chapter 3', 'Math Practice', 'Chemistry Review'].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-700">{task}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* AI Quiz Maker */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6 lg:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-200">
              <FileQuestion className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              AI Quiz Maker
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Create quizzes from notes or PDFs • Multiple choice, true/false, short answer • Auto-grading • Practice with instant feedback
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-violet-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Auto-generate quizzes</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-violet-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Instant feedback</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block lg:order-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#f5f3ff_0%,#fdf4ff_50%,#faf5ff_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-8 left-8 right-8 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-violet-200/50 border border-white/60"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <FileQuestion className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Quiz Mode</div>
                    <div className="text-sm font-semibold text-gray-900">Biology Chapter 5</div>
                  </div>
                </div>
                <span className="text-xs text-violet-600 font-medium">5/10</span>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900">What is photosynthesis?</div>
                <div className="space-y-2">
                  {['Process of energy production', 'Converting light to energy', 'Cell respiration'].map((option, i) => (
                    <button key={i} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-colors ${i === 1 ? 'bg-violet-100 border-2 border-violet-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-fuchsia-200/50 border border-white/60"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-green-600">Correct!</div>
                  <div className="text-xs text-gray-600">Great job on this answer</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        

        {/* Analytics & Progress */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-200">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              Analytics & Progress
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              streaks, accuracy %, time spent • Unlimited insights on premium
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Real-time tracking</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Detailed insights</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#eff6ff_0%,#ecfeff_50%,#f0f9ff_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-blue-200/50 border border-white/60"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Your Progress</h4>
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="h-32 flex items-end gap-2 mb-4">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg" style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">7</div>
                  <div className="text-xs text-gray-500">Day Streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">86%</div>
                  <div className="text-xs text-gray-500">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">4.2h</div>
                  <div className="text-xs text-gray-500">Time Spent</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Student-first UX */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <div className="space-y-6 lg:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
              Student‑first UX
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Fast UI, keyboard shortcuts • Mobile friendly • Privacy‑first by design
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Blazing fast performance</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-pink-600 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
                <span className="text-sm text-gray-700">Privacy protected</span>
              </div>
            </div>
          </div>
          <div className="relative h-[400px] hidden lg:block lg:order-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#fdf2f8_0%,#fff1f2_50%,#fef2f2_100%)] rounded-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-pink-200/50 border border-white/60"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</div>
                    <div className="text-xs text-gray-500">Navigate 10x faster</div>
                  </div>
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-gray-50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">New Note</span>
                    <kbd className="px-2 py-1 bg-white rounded border text-gray-700">⌘ N</kbd>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Search</span>
                    <kbd className="px-2 py-1 bg-white rounded border text-gray-700">⌘ K</kbd>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Quick Actions</span>
                    <kbd className="px-2 py-1 bg-white rounded border text-gray-700">⌘ /</kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================= HOW IT WORKS ================= */


/* ================= COMMUNITY ================= */
function Community() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-14">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-4 text-sm font-semibold text-emerald-800">Weekly Highlights</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            "Top Questions in Physics",
            "Most Popular Notes — Calculus",
            "New Flashcards — Organic Chem",
          ].map((t, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold">{t}</div>
              <p className="mt-1 text-xs text-gray-600">Curated by the community with upvotes & reports.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= ANALYTICS ================= */
function Analytics() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-14">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <div className="text-sm font-medium text-gray-700">Track your progress</div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Streak", value: "7 days" },
            { label: "Flashcard Accuracy", value: "86%" },
            { label: "Time Spent", value: "4h 12m" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">{s.label}</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{s.value}</div>
              <p className="mt-1 text-xs text-gray-600">Premium unlocks unlimited history.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= PRICING ================= */
function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Simple, predictable token pricing</h2>
        <p className="mt-3 text-gray-600">Fixed token cost per generation. No hidden fees, no surprises.</p>
      </div>

      {/* Free Plan Explanation */}
      <div className="mt-10 max-w-4xl mx-auto rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-600 p-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">Free Forever Plan</h3>
            <p className="mt-2 text-gray-600">Get started with 500 free tokens on signup. All features unlocked, just add tokens when you need more AI power.</p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>Unlimited</strong> Projects & Folders</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>Unlimited</strong> Notes</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>Unlimited</strong> Quizzes & Flashcards</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>500 tokens</strong> on signup</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>30-day</strong> analytics history</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span><strong>AI Summarizer, Flashcards & Quiz</strong> (uses tokens)</span>
                </div>
              </div>
            </div>

            <a
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Token Packs */}
      <div className="mt-16 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Coins className="h-5 w-5 text-emerald-700" />
            <h3 className="text-2xl font-bold text-gray-900">Buy Token Packs</h3>
          </div>
          <p className="text-gray-600">One-time purchase. Tokens expire after 30 days. Use them whenever you need AI features.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 500 tokens - $2 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-emerald-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">500</div>
              <div className="text-xs text-gray-500 mt-1">tokens</div>
              <div className="mt-4 mb-4">
                <div className="text-2xl font-bold text-emerald-600">$2</div>
              </div>
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Buy now
              </a>
            </div>
          </div>

          {/* 1000 tokens - $3 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-emerald-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">1,000</div>
              <div className="text-xs text-gray-500 mt-1">tokens</div>
              <div className="mt-4 mb-4">
                <div className="text-2xl font-bold text-emerald-600">$3</div>
              </div>
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Buy now
              </a>
            </div>
          </div>

          {/* 2500 tokens - $5 */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-md hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white whitespace-nowrap">
              Popular
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">2,500</div>
              <div className="text-xs text-gray-500 mt-1">tokens</div>
              <div className="mt-4 mb-4">
                <div className="text-2xl font-bold text-emerald-600">$5</div>
              </div>
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Buy now
              </a>
            </div>
          </div>

          {/* 10000 tokens - $8 */}
          <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-md hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white whitespace-nowrap">
              Best Value
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">10,000</div>
              <div className="text-xs text-gray-500 mt-1">tokens</div>
              <div className="mt-4 mb-4">
                <div className="text-2xl font-bold text-indigo-600">$8</div>
                <div className="text-xs text-green-600 font-semibold mt-1">Save 60%</div>
              </div>
              <a
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Buy now
              </a>
            </div>
          </div>
        </div>

        {/* Pricing Model Explanation */}
        
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        Payments are processed by <strong>Polar</strong> (Stripe gateway). Prices in USD. Fair & transparent pricing.
      </p>
    </section>
  );
}

/* ================= FAQ ================= */
function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 pb-20">
      <h2 className="text-3xl font-bold text-center mb-8">FAQ</h2>
      <div className="space-y-4">
        <FaqDropdown q="What do I get for free?" a="You get 500 free tokens on signup, plus unlimited projects, folders, notes, quizzes, and flashcards. All features are unlocked — tokens are only used when you generate AI content like summaries, flashcards, or quizzes." />
        <FaqDropdown q="How are tokens used?" a="Tokens power AI features like summarizing papers, generating flashcards, and creating quizzes. Each AI generation uses a set number of tokens based on the output. When you run out, simply purchase a token pack to continue." />
        <FaqDropdown q="Do tokens expire?" a="Yes, purchased tokens expire 30 days after purchase. Your account dashboard shows the expiration date for each token pack so you can plan your study sessions accordingly." />
        <FaqDropdown q="What AI features are included?" a="LeafLearning includes an AI Summarizer with citation exports (APA/MLA/Chicago), AI Flashcard Generator, AI Quiz Maker with auto-grading, and an AI Study Planner with spaced repetition scheduling." />
        <FaqDropdown q="Is there a subscription plan?" a="No subscriptions! LeafLearning is free forever with a token-based model. Buy tokens only when you need them — no recurring charges, no commitments." />
        <FaqDropdown q="How do I track my progress?" a="The Analytics dashboard shows your study streaks, quiz accuracy, time spent, and more. Free accounts get 30 days of analytics history to monitor your learning progress." />
      </div>
    </section>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-10 text-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-6 md:grid-cols-3">
        <div className="text-gray-600">© {new Date().getFullYear()} LeafLearning</div>
        <div className="text-center text-gray-500">Built for students, loved by communities</div>
        <div className="flex justify-end gap-5 text-gray-600">
          <a href="#" className="hover:text-gray-900">Privacy</a>
          <a href="#" className="hover:text-gray-900">Terms</a>
          <a href="#" className="hover:text-gray-900">Contact</a>
        </div>
      </div>
    </footer>
  );
}

/* ====== Small, reusable pieces ====== */
function FeatureCard({
  icon,
  title,
  bullets,
}: {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
          {icon}
        </span>
        {title}
      </div>
      <ul className="space-y-2 text-sm text-gray-700">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-indigo-600" /> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="font-semibold">{q}</div>
      <p className="mt-2 text-gray-600">{a}</p>
    </div>
  );
}

function FaqDropdown({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-gray-100">
          <div className="p-5 pt-4 text-gray-600 leading-relaxed">{a}</div>
        </div>
      )}
    </div>
  );
}
