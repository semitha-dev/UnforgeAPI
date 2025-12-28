'use client';

import { Brain, Play, Target, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

interface HeroSectionProps {
  onCTAClick?: () => void;
}

const HeroSection = ({ onCTAClick }: HeroSectionProps) => {

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <Brain size={20} className="text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Atlas Intelligence™ Technology</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-headline text-primary leading-tight">
            Don't Just Study.
            <br />
            <span className="text-accent">Audit Your Knowledge.</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary font-body max-w-4xl mx-auto leading-relaxed">
            Most students fail because they study what they already know. <span className="text-primary font-semibold">Atlas Intelligence™</span> finds your blind spots, tracks your biological rhythm, and tells you exactly what to review <span className="italic">before</span> the exam does.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center space-x-2 px-8 py-4 bg-accent text-accent-foreground font-bold font-cta rounded-xl transition-all duration-250 hover:bg-accent/90 hover:shadow-lg hover:scale-105 text-lg"
            >
              <Target size={20} />
              <span>Start My Knowledge Audit (Free)</span>
            </Link>
            <Link
              href="#atlas"
              className="inline-flex items-center space-x-2 px-8 py-4 border-2 border-accent text-accent font-bold font-cta rounded-xl transition-all duration-250 hover:bg-accent/10 text-lg"
            >
              <Play size={20} />
              <span>See How Atlas Works</span>
            </Link>
          </div>

          {/* Stats Bar - The Proof */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center space-x-3">
                <Target size={28} className="text-emerald-500" />
                <div className="text-left">
                  <div className="text-2xl font-bold font-headline text-primary">100%</div>
                  <div className="text-sm text-text-secondary font-body">Blind Spot Detection</div>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center space-x-3">
                <Clock size={28} className="text-blue-500" />
                <div className="text-left">
                  <div className="text-2xl font-bold font-headline text-primary">Daily</div>
                  <div className="text-sm text-text-secondary font-body">Biological Optimization</div>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center space-x-3">
                <Shield size={28} className="text-accent" />
                <div className="text-left">
                  <div className="text-2xl font-bold font-headline text-accent">Zero</div>
                  <div className="text-sm text-text-secondary font-body">Exams Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trusted by students */}
          <div className="pt-8 opacity-70">
            <p className="text-sm text-text-secondary font-body mb-4">Trusted by students studying for</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <span className="px-4 py-2 bg-card/50 rounded-lg text-sm font-medium text-text-primary border border-border">Medical Exams</span>
              <span className="px-4 py-2 bg-card/50 rounded-lg text-sm font-medium text-text-primary border border-border">Law School</span>
              <span className="px-4 py-2 bg-card/50 rounded-lg text-sm font-medium text-text-primary border border-border">Engineering</span>
              <span className="px-4 py-2 bg-card/50 rounded-lg text-sm font-medium text-text-primary border border-border">A-Levels / O-Levels</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;