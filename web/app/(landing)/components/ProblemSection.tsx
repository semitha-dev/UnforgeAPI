'use client';

import { AlertTriangle, Trophy, BatteryLow, Hourglass, Brain } from 'lucide-react';

const ProblemSection = () => {
  const problems = [
    {
      icon: Trophy,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      title: 'The "Hollow Victory" Trap',
      description: 'You have beautiful notes, but have you tested yourself? Reading creates familiarity, not competence. You don\'t realize you can\'t recall the answer until you\'re in the exam hall.',
    },
    {
      icon: BatteryLow,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      title: 'The "Biological Mismatch"',
      description: 'You force yourself to study at 11 PM when your retention is at 20%. You are wasting hours "grinding" when your brain has already shut down.',
    },
    {
      icon: Hourglass,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      title: 'The "Silent Decay"',
      description: 'The Ebbinghaus Forgetting Curve is real. Without a "Decay Meter," you don\'t know a topic has faded from memory until you try to use it and fail.',
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-error/10 rounded-full border border-error/20">
            <AlertTriangle size={20} className="text-error" />
            <span className="text-sm font-semibold font-cta text-error">The Hidden Problem</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            The "Illusion of Competence"
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Why traditional notes and flashcards are failing you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <div 
                key={index} 
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className="p-8 space-y-6">
                  <div className={`w-16 h-16 ${problem.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComponent size={32} className={problem.iconColor} />
                  </div>
                  <h3 className="text-xl font-bold font-headline text-primary">{problem.title}</h3>
                  <p className="text-text-secondary font-body leading-relaxed">{problem.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* The Real Cost */}
        <div className="bg-gradient-to-br from-error/5 to-warning/5 rounded-2xl p-8 border border-error/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Brain size={28} className="text-error" />
                <h3 className="text-2xl font-bold font-headline text-primary">You're Not Studying Wrong...</h3>
              </div>
              <p className="text-lg text-text-secondary font-body leading-relaxed">
                You're studying <span className="text-primary font-semibold">blind</span>. Without knowing your weak points, 
                your optimal study times, or which memories are decaying, you're essentially playing darts in the dark.
              </p>
              <div className="flex items-center space-x-4 text-text-secondary">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-error rounded-full"></div>
                  <span className="text-sm font-body">Studying what you already know</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-text-secondary">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-error rounded-full"></div>
                  <span className="text-sm font-body">Missing critical gaps in your knowledge</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-text-secondary">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-error rounded-full"></div>
                  <span className="text-sm font-body">Letting memories decay unnoticed</span>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-8 border border-border text-center">
              <div className="text-6xl font-bold font-headline text-error mb-2">68%</div>
              <div className="text-text-secondary font-body mb-6">of exam failures come from <br/><span className="text-primary font-semibold">topics students thought they knew</span></div>
              <div className="pt-6 border-t border-border">
                <div className="text-sm text-text-secondary font-body">The solution isn't studying <em>more</em>.</div>
                <div className="text-lg font-bold font-headline text-accent mt-2">It's studying <em>smarter</em>.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;