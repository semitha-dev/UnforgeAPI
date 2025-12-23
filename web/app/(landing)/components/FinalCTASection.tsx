'use client';

import { useState, useEffect } from 'react';
import { Clock, BadgeCheck, Zap, ShieldCheck, Rocket, Star } from 'lucide-react';
import ConversionCTA from '@/components/common/ConversionCTA';

const FinalCTASection = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 47,
    minutes: 59,
    seconds: 59
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHydrated]);

  return (
    <section className="py-20 bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-card rounded-lg border-2 border-accent/20 shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-accent to-secondary p-1">
            <div className="bg-card p-8 md:p-12">
              <div className="text-center space-y-8">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-warning/10 rounded-full border border-warning/20">
                  <Clock size={20} className="text-warning fill-warning" />
                  <span className="text-sm font-semibold font-cta text-warning">Limited Time Offer</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
                  Start Learning Smarter Today
                </h2>

                <p className="text-xl text-text-secondary font-body max-w-2xl mx-auto">
                  Join 1K+ students who transformed their study habits. Get 100 free tokens when you sign up now.
                </p>

                <div className="bg-muted/30 rounded-lg p-6 inline-block">
                  <div className="text-sm text-text-secondary font-body mb-3">Bonus tokens expire in:</div>
                  <div className="flex items-center justify-center space-x-4">
                    {[
                      { value: isHydrated ? timeLeft.hours : 47, label: 'Hours' },
                      { value: isHydrated ? timeLeft.minutes : 59, label: 'Minutes' },
                      { value: isHydrated ? timeLeft.seconds : 59, label: 'Seconds' }
                    ].map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="w-20 h-20 bg-accent rounded-lg flex items-center justify-center">
                          <span className="text-3xl font-bold font-headline text-accent-foreground">
                            {String(item.value).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary font-body mt-2">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <ConversionCTA variant="final" />
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-border">
                  {[
                    { icon: BadgeCheck, text: 'No Credit Card Required' },
                    { icon: Zap, text: 'Instant Access' },
                    { icon: ShieldCheck, text: '30-Day Guarantee' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-center space-x-2">
                      <item.icon size={20} className="text-success fill-success" />
                      <span className="text-sm font-medium font-body text-text-primary">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-4 gap-6">
          {[
            { value: '10X', label: 'Faster Learning', icon: Rocket },
            { value: '98.5%', label: 'AI Accuracy', icon: BadgeCheck },
            { value: '65%', label: 'Time Saved', icon: Clock },
            { value: '4.9★', label: 'Student Rating', icon: Star }
          ].map((stat, index) => (
            <div key={index} className="bg-card rounded-lg p-6 border border-border text-center">
              <stat.icon size={32} className="text-accent mx-auto mb-3 fill-accent" />
              <div className="text-3xl font-bold font-headline text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-text-secondary font-body">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;