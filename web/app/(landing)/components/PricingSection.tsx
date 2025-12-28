'use client';

import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, FileSearch, Map, Clock, Timer, GraduationCap, ShieldCheck, RefreshCw, Lock, Zap } from 'lucide-react';
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

  const includedFeatures = [
    'Atlas Intelligence™ (All 4 Algorithms)',
    'Unlimited Note Uploads',
    'Flashcard Generation',
    'Quiz Generation',
    'Knowledge Heatmap',
    'Biological Rhythm Analysis',
    'Forgetting Curve Predictions',
    'Morning Reports & Alerts'
  ];

  // Tangible examples showing value
  const insightExamples = [
    {
      icon: FileSearch,
      insight: 'Chapter Audit',
      tokens: '~150',
      example: 'Scan 1 chapter for missing topics',
      color: 'emerald',
    },
    {
      icon: Map,
      insight: 'Heatmap Update',
      tokens: '~50',
      example: 'Find your blind spots',
      color: 'purple',
    },
    {
      icon: Clock,
      insight: 'Rhythm Analysis',
      tokens: 'Free',
      example: 'Find your peak study hours',
      color: 'blue',
    },
    {
      icon: Timer,
      insight: 'Decay Alert',
      tokens: 'Free',
      example: 'Know when memory fades',
      color: 'orange',
    },
  ];

  const colorClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  };

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <Sparkles size={20} className="text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Pay for Insights, Not Subscriptions</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Buy tokens once. Use them for powerful AI insights. No monthly fees. No surprises.
          </p>
        </div>

        {/* Token Packs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {tokenPacks.map((pack, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-2xl p-3 sm:p-6 border-2 transition-all duration-250 ${
                pack.popular
                  ? 'border-accent shadow-lg sm:scale-105'
                  : pack.bestValue
                  ? 'border-success shadow-lg'
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
                  className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold font-cta transition-all duration-250 text-xs sm:text-sm text-center block ${
                    pack.popular
                      ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                      : 'bg-muted text-text-primary hover:bg-accent/10'
                  }`}
                >
                  Get Started
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* What Tokens Buy You - Tangible Examples */}
        <div className="bg-gradient-to-br from-accent/5 via-background to-secondary/5 rounded-2xl p-4 sm:p-8 border border-border shadow-sm mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-2xl font-bold font-headline text-primary mb-2 text-center">
            What Do Tokens Buy You?
          </h3>
          <p className="text-sm text-text-secondary font-body text-center mb-6">Real examples of Atlas Intelligence insights</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {insightExamples.map((item, index) => {
              const colors = colorClasses[item.color as keyof typeof colorClasses];
              return (
                <div key={index} className="bg-card rounded-xl p-4 border border-border text-center space-y-3">
                  <div className={`w-12 h-12 ${colors.split(' ')[1]} rounded-xl flex items-center justify-center mx-auto`}>
                    <item.icon size={24} className={colors.split(' ')[0]} />
                  </div>
                  <div>
                    <div className="font-bold font-headline text-primary text-sm">{item.insight}</div>
                    <div className="text-xs text-text-secondary font-body">{item.example}</div>
                  </div>
                  <div className={`inline-block px-3 py-1 ${colors.split(' ')[1]} rounded-full`}>
                    <span className={`text-xs font-bold font-cta ${colors.split(' ')[0]}`}>{item.tokens} tokens</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-xs text-text-secondary font-body text-center mt-6">
            💡 Example: A full chapter audit (~150 tokens) costs approximately {isLKR ? 'Rs. 45' : '$0.30'} with the Popular pack
          </p>
        </div>

        {/* What's Included */}
        <div className="bg-card rounded-2xl p-4 sm:p-8 border border-border shadow-sm mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-2xl font-bold font-headline text-primary mb-4 sm:mb-6 text-center">
            Every Token Unlocks Everything
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {includedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle size={16} className="text-success flex-shrink-0 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base text-text-primary font-body">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Free Tokens CTA */}
        <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-2xl p-6 sm:p-10 border-2 border-accent/20 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto">
              <GraduationCap size={32} className="text-accent" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-headline text-primary">
              Start Free. No Credit Card Required.
            </h3>
            <p className="text-lg text-text-secondary font-body">
              Get <span className="font-bold text-accent">500 free tokens</span> when you sign up. 
              That's enough for 3 full chapter audits or 10 flashcard sets.
            </p>
            <div className="pt-4">
              <ConversionCTA variant="pricing" />
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 sm:mt-12 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {[
              { icon: ShieldCheck, text: 'Secure Payment' },
              { icon: RefreshCw, text: 'No Subscription Traps' },
              { icon: Lock, text: 'Privacy Protected' },
              { icon: Zap, text: 'Instant Activation' }
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