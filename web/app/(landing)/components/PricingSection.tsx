'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, FileText, Layers, ClipboardCheck, Calendar, GraduationCap, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import ConversionCTA from '@/components/common/ConversionCTA';
import { useCurrency } from '@/lib/useCurrency';

interface TokenPack {
  tokens: number;
  price: number;
  perToken: number;
  popular?: boolean;
  bestValue?: boolean;
}

const PricingSection = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState(2500);
  const { isLKR, formatPrice, formatPerToken } = useCurrency();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tokenPacks: TokenPack[] = [
    { tokens: 500, price: 2, perToken: 0.004 },
    { tokens: 1000, price: 3, perToken: 0.003 },
    { tokens: 2500, price: 5, perToken: 0.002, popular: true },
    { tokens: 10000, price: 8, perToken: 0.0008, bestValue: true }
  ];

  const features = [
    'AI Document Summarization',
    'Automatic Flashcard Generation',
    'Quiz Generation',
    'Study Schedule Planning',
    'Progress Analytics',
    'Spaced Repetition Learning',
    'All Features Included',
    'No Expiration on Tokens'
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <DollarSign size={20} className="text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Simple Token-Based Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Pay Only for What You Use
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            No subscriptions. No hidden fees. Buy tokens once and use them whenever you need.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {tokenPacks.map((pack, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-lg p-3 sm:p-6 border-2 transition-all duration-250 ${
                pack.popular
                  ? 'border-accent shadow-card sm:scale-105'
                  : pack.bestValue
                  ? 'border-success shadow-card'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2">
                  <div className="px-2 sm:px-4 py-0.5 sm:py-1 bg-accent text-accent-foreground text-[10px] sm:text-xs font-bold font-cta rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </div>
                </div>
              )}
              {pack.bestValue && (
                <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2">
                  <div className="px-2 sm:px-4 py-0.5 sm:py-1 bg-success text-success-foreground text-[10px] sm:text-xs font-bold font-cta rounded-full whitespace-nowrap">
                    BEST VALUE
                  </div>
                </div>
              )}
              <div className="text-center space-y-2 sm:space-y-4">
                <div className="text-2xl sm:text-4xl font-bold font-headline text-primary">{pack.tokens.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-text-secondary font-body">Tokens</div>
                <div className="text-xl sm:text-3xl font-bold font-headline text-accent">
                  {formatPrice(pack.price)}
                </div>
                <div className="text-[10px] sm:text-xs text-text-secondary font-body">
                  {formatPerToken(pack.perToken)}
                </div>
                <a
                  href="/signup"
                  className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold font-cta transition-all duration-250 text-xs sm:text-sm text-center block ${
                    selectedTokens === pack.tokens
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-text-primary hover:bg-accent/10'
                  }`}
                >
                  Get Started
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-4 sm:p-8 border border-border shadow-sm mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-2xl font-bold font-headline text-primary mb-4 sm:mb-6 text-center">
            What's Included in Every Plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle size={16} className="text-success flex-shrink-0 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base text-text-primary font-body">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg p-4 sm:p-8 border-2 border-accent/20">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg sm:text-2xl font-bold font-headline text-primary">How Tokens Work</h3>
              <p className="text-sm sm:text-base text-text-secondary font-body mb-3 sm:mb-4">~4 words of AI output = 1 token. Tokens are charged based on actual output length.</p>
              <ul className="space-y-2 sm:space-y-3">
                {[
                  { action: 'Document Summary', cost: '~50-200 tokens', icon: FileText },
                  { action: 'Flashcard Set', cost: '~100-300 tokens', icon: Layers },
                  { action: 'Quiz Generation', cost: '~80-150 tokens', icon: ClipboardCheck }
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={index} className="flex items-center justify-between p-2 sm:p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <IconComponent size={16} className="text-accent sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base text-text-primary font-body">{item.action}</span>
                      </div>
                      <span className="text-[10px] sm:text-sm font-bold font-cta text-accent whitespace-nowrap ml-2">{item.cost}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-card rounded-lg p-4 sm:p-6 border border-border text-center space-y-3 sm:space-y-4">
              <GraduationCap size={36} className="text-accent mx-auto sm:w-12 sm:h-12" />
              <h4 className="text-lg sm:text-xl font-bold font-headline text-primary">Free Tokens on Signup</h4>
              <p className="text-sm sm:text-base text-text-secondary font-body">
                Start with 500 free tokens when you create your account. No credit card required!
              </p>
              <div className="pt-2 sm:pt-4">
                <ConversionCTA variant="pricing" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {[
              { icon: ShieldCheck, text: 'Secure Payment' },
              { icon: RefreshCw, text: 'No Subscription' },
              { icon: Lock, text: 'Privacy Protected' }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex items-center space-x-1.5 sm:space-x-2">
                  <IconComponent size={16} className="text-success sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm text-text-secondary font-body">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;