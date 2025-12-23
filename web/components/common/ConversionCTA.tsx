'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Rocket, Gift } from 'lucide-react';

interface ConversionCTAProps {
  variant?: 'hero' | 'pricing' | 'final' | 'inline';
  className?: string;
}

const ConversionCTA = ({ variant = 'hero', className = '' }: ConversionCTAProps) => {
  const variants = {
    hero: {
      text: 'Start Free Today',
      subtext: 'No credit card required',
      icon: Sparkles,
      size: 'large',
      gradient: 'from-accent to-secondary',
    },
    pricing: {
      text: 'Get Started Now',
      subtext: '500 free tokens included',
      icon: Rocket,
      size: 'medium',
      gradient: 'from-accent to-accent',
    },
    final: {
      text: 'Claim Your Bonus Tokens',
      subtext: '500 bonus tokens expire soon',
      icon: Gift,
      size: 'large',
      gradient: 'from-accent via-secondary to-accent',
    },
    inline: {
      text: 'Try Free',
      subtext: '',
      icon: ArrowRight,
      size: 'small',
      gradient: 'from-accent to-accent',
    },
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Link
        href="/signup"
        className={`
          group relative inline-flex items-center justify-center space-x-2
          bg-gradient-to-r ${config.gradient}
          text-white font-semibold font-cta
          rounded-full shadow-lg
          hover:shadow-xl hover:scale-105
          transition-all duration-300
          ${sizeClasses[config.size as keyof typeof sizeClasses]}
        `}
      >
        <IconComponent className="w-5 h-5" />
        <span>{config.text}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        
        {/* Animated background glow */}
        <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
      
      {config.subtext && (
        <span className="mt-2 text-sm text-text-secondary font-body">
          {config.subtext}
        </span>
      )}
    </div>
  );
};

export default ConversionCTA;
