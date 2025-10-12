"use client";

import React from "react";
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
      <HowItWorks />
      <Community />
      <Analytics />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

/* ================= NAV ================= */
function Nav() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <span>Unforge Study</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
          <a href="#how" className="text-gray-600 hover:text-gray-900">How it works</a>
          <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
          <a href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</a>
          <a href="#docs" className="text-gray-600 hover:text-gray-900">Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/signin" className="rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Log in</a>
          <a
            href="/signup"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
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
    <section className="relative mx-auto max-w-7xl px-6 pt-14 pb-16">
      {/* grid background like the reference */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="mx-auto h-[36rem] w-full max-w-7xl rounded-[2rem] bg-white/70 shadow-sm ring-1 ring-gray-200">
          <div className="h-full w-full rounded-[2rem] bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
      </div>

      <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        {/* Left copy */}
        <div className="mx-auto max-w-2xl text-center md:mx-0 md:text-left">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 md:mx-0">
            ⚡ AI-powered academic assistant
          </p>

          <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
            One tool to <HighlightUnderline word="study" /> smarter and faster
          </h1>

          <p className="mt-5 text-base text-gray-600 md:text-lg">
            Summarize papers, auto-create flashcards, and build a plan around your exam date. Explore a community library for extra practice.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Log in
            </a>
          </div>
        </div>

        {/* Right demo card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative mx-auto w-full max-w-lg"
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">Try it in seconds</div>
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                Drop PDF here or <span className="font-medium text-gray-700">browse</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="font-semibold">Key points</div>
                <ul className="mt-2 list-disc pl-5 text-gray-600">
                  <li>Method highlights with citations</li>
                  <li>Findings summarized in 5 bullets</li>
                  <li>References exported (APA/MLA)</li>
                </ul>
              </div>
              <div className="h-1.5 w-2/3 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
            </div>
          </div>

          {/* Floating subject icons */}
          <FloatingIcon className="left-[-18px] top-[-18px]" delay={0}>
            <BookOpen className="h-8 w-8 text-emerald-700" />
          </FloatingIcon>
          <FloatingIcon className="right-[-18px] top-[-18px]" delay={0.2}>
            <Brain className="h-8 w-8 text-emerald-600" />
          </FloatingIcon>
          <FloatingIcon className="left-[-18px] bottom-[-18px]" delay={0.35}>
            <BarChart3 className="h-8 w-8 text-emerald-500" />
          </FloatingIcon>
          <FloatingIcon className="right-[-18px] bottom-[-18px]" delay={0.5}>
            <CalendarCheck2 className="h-8 w-8 text-emerald-700" />
          </FloatingIcon>
        </motion.div>
      </div>
    </section>
  );
}

function HighlightUnderline({ word }: { word: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{word}</span>
      <span
        aria-hidden
        className="absolute -bottom-1 left-0 h-2 w-full rounded-sm bg-emerald-300"
      />
    </span>
  );
}

function FloatingIcon({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 6, opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: "reverse", duration: 3.8, delay }}
      className={`absolute ${className}`}
    >
      <div className="grid place-items-center rounded-full bg-white p-2 shadow-md ring-1 ring-gray-200">
        {children}
      </div>
    </motion.div>
  );
}

/* ================= FEATURES ================= */
function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-3xl font-bold md:text-4xl">Everything you need to study smarter</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
        AI tools + a community library to compress knowledge fast, practice deliberately, and track progress.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<BookOpen className="h-5 w-5 text-emerald-700" />}
          title="AI Summarizer with Citations"
          bullets={[
            "Summarizes academic papers & articles",
            "Highlights methodology, findings, key points",
            "APA / MLA / Chicago exports + bibliography",
          ]}
        />
        <FeatureCard
          icon={<Brain className="h-5 w-5 text-emerald-700" />}
          title="AI Flashcard Generator"
          bullets={[
            "Convert PDFs or notes into decks",
            "Definitions • MCQ • T/F • Applied",
            "Organize by topic, chapter, difficulty",
          ]}
        />
        <FeatureCard
          icon={<CalendarCheck2 className="h-5 w-5 text-emerald-700" />}
          title="AI Study Planner"
          bullets={[
            "Schedules from subject + exam date",
            "Spaced repetition built‑in",
            "Adapts to progress + feedback",
          ]}
        />
        <FeatureCard
          icon={<CloudUpload className="h-5 w-5 text-emerald-700" />}
          title="Community Notes & Questions"
          bullets={[
            "Upload notes, flashcards, practice Qs by subject",
            "Browse Physics, Math, Chemistry and more",
            "Convert shared notes → AI flashcards (Premium)",
          ]}
        />
        <FeatureCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
          title="Analytics & Progress"
          bullets={[
            "Free: last 3 days history",
            "Premium: streaks, accuracy %, time spent",
            "Unlimited insights on premium",
          ]}
        />
        <FeatureCard
          icon={<Sparkles className="h-5 w-5 text-emerald-700" />}
          title="Student‑first UX"
          bullets={[
            "Fast UI, keyboard shortcuts",
            "Mobile friendly",
            "Privacy‑first by design",
          ]}
        />
      </div>
    </section>
  );
}

/* ================= HOW IT WORKS ================= */
function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 pb-14">
      <h3 className="text-center text-2xl font-semibold md:text-3xl">How it works</h3>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { step: "1", title: "Sign up", body: "Create a free account or use Google. Tokens unlock AI features." },
          { step: "2", title: "Add material", body: "Upload PDFs or pick from the community library by subject." },
          { step: "3", title: "Study smarter", body: "Generate summaries, flashcards, and a plan around your exam date." },
        ].map(({ step, title, body }) => (
          <div key={step} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 text-xs font-semibold text-gray-500">Step {step}</div>
            <div className="text-lg font-semibold">{title}</div>
            <p className="mt-2 text-sm text-gray-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

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
const plans = {
  premium: {
    price: 6.99,
    tokens: 20000,
    folders: 6,
  },
};

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Simple, fair pricing</h2>
        <p className="mt-3 text-gray-600">Upgrade any time. Token packs available for all users.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-semibold">Free</h3>
            <span className="text-sm text-gray-600">$0 / month</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            {[
              "2 subject folders",
              "Create notes & flashcards manually",
              "Browse up to 10 community items/day",
              "Analytics for the past 3 days",
              "Buy token packs to use AI",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>
          <a
            href="/signup"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            Get started
          </a>
        </div>

        {/* Premium */}
        <div className="relative rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm">
          <div className="absolute -top-3 right-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            Most popular
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-semibold">Premium</h3>
            <span className="text-sm text-gray-700">${plans.premium.price.toFixed(2)} / month</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-800">
            {[
              `Up to ${plans.premium.folders} subject folders`,
              `${plans.premium.tokens.toLocaleString()} tokens/month included`,
              "Full AI access: summarizer, flashcards, planner",
              "Unlimited community access",
              "Convert shared notes → AI flashcards",
              "Unlimited analytics & insights",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-700" /> {t}
              </li>
            ))}
          </ul>
          <a
            href="/upgrade"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
          >
            Upgrade now <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Token Boosts */}
      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Coins className="h-4 w-4 text-emerald-700" />
          <span className="text-sm font-semibold text-gray-700">Need more AI power?</span>
        </div>
        <p className="text-sm text-gray-600">Top up anytime—no subscription changes, boosts apply instantly.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Boost +50,000 tokens</div>
                <div className="text-xs text-gray-600">Great for a heavy study week</div>
              </div>
              <span className="text-sm font-semibold">$3</span>
            </div>
            <button className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Add boost</button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Boost +200,000 tokens</div>
                <div className="text-xs text-gray-600">Perfect for exam crunch time</div>
              </div>
              <span className="text-sm font-semibold">$5</span>
            </div>
            <button className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Add boost</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">One‑time purchase • Works on Free and Premium</p>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        Payments are processed by <strong>Polar</strong> (Stripe gateway). Prices in USD.
      </p>
    </section>
  );
}

/* ================= FAQ ================= */
function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="text-3xl font-bold">FAQ</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <FaqCard q="How are tokens used?" a="Each AI call consumes tokens from your allowance or add‑ons. Free users can buy packs; Premium includes 20K/month." />
        <FaqCard q="What happens on the Free plan?" a="Create 2 folders, browse up to 10 community items/day, view 3‑day analytics, and buy token packs for AI features." />
        <FaqCard q="Can I cancel anytime?" a="Yes. Premium is billed monthly; access remains until the end of your billing cycle." />
        <FaqCard q="Are citation exports accurate?" a="Exports follow APA/MLA/Chicago formats; verify with your institution’s guidelines." />
      </div>
    </section>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-10 text-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-6 md:grid-cols-3">
        <div className="text-gray-600">© {new Date().getFullYear()} Unforge Study</div>
        <div className="text-center text-gray-500">Built for students, loved by communities</div>
        <div className="flex justify-end gap-5 text-gray-600">
          <a href="#docs" className="hover:text-gray-900">Docs</a>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
          {icon}
        </span>
        {title}
      </div>
      <ul className="space-y-2 text-sm text-gray-700">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> {b}
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
