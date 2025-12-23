'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, FileText, Layers, ClipboardCheck, Calendar, GraduationCap, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import ConversionCTA from '@/components/common/ConversionCTA';

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

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {tokenPacks.map((pack, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-lg p-6 border-2 transition-all duration-250 ${
                pack.popular
                  ? 'border-accent shadow-card scale-105'
                  : pack.bestValue
                  ? 'border-success shadow-card'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 bg-accent text-accent-foreground text-xs font-bold font-cta rounded-full">
                    MOST POPULAR
                  </div>
                </div>
              )}
              {pack.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 bg-success text-success-foreground text-xs font-bold font-cta rounded-full">
                    BEST VALUE
                  </div>
                </div>
              )}
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold font-headline text-primary">{pack.tokens.toLocaleString()}</div>
                <div className="text-sm text-text-secondary font-body">Tokens</div>
                <div className="text-3xl font-bold font-headline text-accent">
                  ${pack.price}
                </div>
                <div className="text-xs text-text-secondary font-body">
                  ${pack.perToken.toFixed(4)}/token
                </div>
                <button
                  onClick={() => setSelectedTokens(pack.tokens)}
                  className={`w-full px-4 py-2 rounded-lg font-bold font-cta transition-all duration-250 ${
                    selectedTokens === pack.tokens
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-text-primary hover:bg-accent/10'
                  }`}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-8 border border-border shadow-sm mb-12">
          <h3 className="text-2xl font-bold font-headline text-primary mb-6 text-center">
            What's Included in Every Plan
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle size={20} className="text-success flex-shrink-0" />
                <span className="text-text-primary font-body">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg p-8 border-2 border-accent/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold font-headline text-primary">How Tokens Work</h3>
              <p className="text-text-secondary font-body mb-4">~4 words of AI output = 1 token. Tokens are charged based on actual output length.</p>
              <ul className="space-y-3">
                {[
                  { action: 'Document Summary', cost: '~50-200 tokens', icon: FileText },
                  { action: 'Flashcard Set', cost: '~100-300 tokens', icon: Layers },
                  { action: 'Quiz Generation', cost: '~80-150 tokens', icon: ClipboardCheck },
                  { action: 'Study Schedule', cost: '~50-100 tokens', icon: Calendar }
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={index} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center space-x-3">
                        <IconComponent size={20} className="text-accent" />
                        <span className="text-text-primary font-body">{item.action}</span>
                      </div>
                      <span className="text-sm font-bold font-cta text-accent">{item.cost}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border text-center space-y-4">
              <GraduationCap size={48} className="text-accent mx-auto" />
              <h4 className="text-xl font-bold font-headline text-primary">Free Tokens on Signup</h4>
              <p className="text-text-secondary font-body">
                Start with 100 free tokens when you create your account. No credit card required!
              </p>
              <div className="pt-4">
                <ConversionCTA variant="pricing" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center space-x-8">
            {[
              { icon: ShieldCheck, text: 'Secure Payment' },
              { icon: RefreshCw, text: 'No Subscription' },
              { icon: Lock, text: 'Privacy Protected' }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex items-center space-x-2">
                  <IconComponent size={20} className="text-success" />
                  <span className="text-sm text-text-secondary font-body">{item.text}</span>
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