'use client';

import { useState, useEffect } from 'react';
import { Sparkles, GraduationCap } from 'lucide-react';
import ConversionCTA from '@/components/common/ConversionCTA';

interface HeroSectionProps {
  onCTAClick?: () => void;
}

const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [documentsProcessed, setDocumentsProcessed] = useState(125847);
  const [studyHoursSaved, setStudyHoursSaved] = useState(45293);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const docInterval = setInterval(() => {
      setDocumentsProcessed(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 3000);

    const hoursInterval = setInterval(() => {
      setStudyHoursSaved(prev => prev + Math.floor(Math.random() * 2) + 1);
    }, 4000);

    return () => {
      clearInterval(docInterval);
      clearInterval(hoursInterval);
    };
  }, [isHydrated]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <Sparkles size={20} className="text-accent fill-accent" />
            <span className="text-sm font-semibold font-cta text-accent">AI-Powered Study Revolution</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-headline text-primary leading-tight">
            Study Smarter with AI
            <br />
            <span className="text-accent">Learn 10X Faster</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-secondary font-body max-w-3xl mx-auto">
            Transform any document into flashcards, summaries, and quizzes in seconds. Your AI study companion for academic success.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ConversionCTA variant="hero" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto pt-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 sm:p-6 border border-border shadow-sm">
              <div className="text-xl sm:text-3xl font-bold font-headline text-primary">
                {isHydrated ? documentsProcessed.toLocaleString() : '125,847'}
              </div>
              <div className="text-[10px] sm:text-sm text-text-secondary font-body mt-0.5 sm:mt-1">Documents Processed</div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 sm:p-6 border border-border shadow-sm">
              <div className="text-xl sm:text-3xl font-bold font-headline text-primary">
                {isHydrated ? studyHoursSaved.toLocaleString() : '45,293'}
              </div>
              <div className="text-[10px] sm:text-sm text-text-secondary font-body mt-0.5 sm:mt-1">Study Hours Saved</div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 sm:p-6 border border-border shadow-sm">
              <div className="text-xl sm:text-3xl font-bold font-headline text-accent">1K+</div>
              <div className="text-[10px] sm:text-sm text-text-secondary font-body mt-0.5 sm:mt-1">Active Students</div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 sm:p-6 border border-border shadow-sm">
              <div className="text-xl sm:text-3xl font-bold font-headline text-accent">4.9★</div>
              <div className="text-[10px] sm:text-sm text-text-secondary font-body mt-0.5 sm:mt-1">Student Rating</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-8 opacity-60">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <GraduationCap size={20} className="text-primary w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium font-body text-text-primary">Medical Students</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <GraduationCap size={20} className="text-primary w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium font-body text-text-primary">Law Students</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <GraduationCap size={20} className="text-primary w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium font-body text-text-primary">Engineering Students</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <GraduationCap size={20} className="text-primary w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium font-body text-text-primary">Business Students</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;