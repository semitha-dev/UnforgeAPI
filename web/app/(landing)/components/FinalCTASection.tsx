'use client';

import { useState, useEffect } from 'react';
import { Brain, BadgeCheck, Zap, ShieldCheck, Target, Clock, Map, Timer } from 'lucide-react';
import ConversionCTA from '@/components/common/ConversionCTA';

const FinalCTASection = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-card rounded-2xl border-2 border-accent/20 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-accent to-secondary p-1">
            <div className="bg-card p-8 md:p-12">
              <div className="text-center space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
                  <Brain size={20} className="text-accent" />
                  <span className="text-sm font-semibold font-cta text-accent">Atlas Intelligence™</span>
                </div>

                {/* Headline */}
                <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                  Stop Guessing. Start Knowing.
                </h2>

                {/* Subhead */}
                <p className="text-xl text-text-secondary font-body max-w-2xl mx-auto">
                  Your first Knowledge Audit is free. See exactly what you're missing before your next exam.
                </p>

                {/* What You Get Box */}
                <div className="bg-muted/30 rounded-2xl p-6 max-w-lg mx-auto">
                  <div className="text-sm font-bold font-cta text-primary mb-4">Your Free Account Includes:</div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      '500 Free Tokens',
                      'Content Gap Audit',
                      'Knowledge Heatmap',
                      'Biological Rhythm',
                      'Forgetting Curve',
                      'Morning Reports'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <BadgeCheck size={16} className="text-success flex-shrink-0" />
                        <span className="text-sm text-text-primary font-body">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <ConversionCTA variant="final" />
                </div>

                {/* Trust Badges */}
                <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-border">
                  {[
                    { icon: BadgeCheck, text: 'No Credit Card Required' },
                    { icon: Zap, text: 'Instant Atlas Access' },
                    { icon: ShieldCheck, text: 'Your Data Stays Private' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-center space-x-2">
                      <item.icon size={20} className="text-success" />
                      <span className="text-sm font-medium font-body text-text-primary">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Atlas Algorithm Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '100%', label: 'Blind Spot Detection', icon: Target, color: 'text-emerald-500 bg-emerald-500/10' },
            { value: '4', label: 'Atlas Algorithms', icon: Brain, color: 'text-purple-500 bg-purple-500/10' },
            { value: '3hr', label: 'Golden Window Found', icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
            { value: '40%', label: 'Decay Alert Threshold', icon: Timer, color: 'text-orange-500 bg-orange-500/10' }
          ].map((stat, index) => (
            <div key={index} className="bg-card rounded-xl p-4 md:p-6 border border-border text-center">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color.split(' ')[1]} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <stat.icon size={24} className={stat.color.split(' ')[0]} />
              </div>
              <div className="text-2xl md:text-3xl font-bold font-headline text-primary mb-1">{stat.value}</div>
              <div className="text-xs md:text-sm text-text-secondary font-body">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;