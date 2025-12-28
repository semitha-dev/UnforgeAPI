'use client';

import { Brain, FileSearch, Map, Clock, Timer, Upload, Cpu, Sun, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const SolutionSection = () => {
  const atlasAlgorithms = [
    {
      icon: FileSearch,
      color: 'emerald',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/50',
      headline: 'Syllabus Protection',
      title: 'The Content Gap Audit',
      description: 'Atlas scans your notes against university standards. It automatically flags missing topics (e.g., "You covered Photosynthesis but missed the Calvin Cycle").',
    },
    {
      icon: Map,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20',
      hoverBorder: 'hover:border-purple-500/50',
      headline: 'Blind Spot Detection',
      title: 'The Knowledge Heatmap',
      description: 'Atlas connects your notes to your flashcards. It proactively warns you: "You have 2,000 words of notes on \'Contract Law\', but 0 active questions. Create cards now."',
    },
    {
      icon: Clock,
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/50',
      headline: 'Peak Performance Scheduling',
      title: 'Biological Rhythm',
      description: 'Stop studying when you\'re tired. Atlas analyzes your accuracy by hour of the day to find your "Golden Window"—the 3 hours where your brain learns 2x faster.',
    },
    {
      icon: Timer,
      color: 'orange',
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-500/20',
      hoverBorder: 'hover:border-orange-500/50',
      headline: 'Memory Decay Prediction',
      title: 'The Forgetting Curve',
      description: 'No more cramming. The "Decay Meter" visualizes exactly when a memory is fading (Ebbinghaus Curve) and alerts you the moment you need to review.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      icon: Upload,
      title: 'Upload or Write',
      description: 'Dump your lecture slides, PDFs, or messy class notes into LeafLearning.',
    },
    {
      step: '2',
      icon: Cpu,
      title: 'Atlas Audits You',
      description: 'The AI instantly scans for Content Gaps and identifies concepts you missed.',
    },
    {
      step: '3',
      icon: Sun,
      title: 'The Morning Report',
      description: 'Wake up to a personalized briefing: "Good morning. Your retention on \'Anatomy\' has dropped to 40%. Review it now during your 9 AM peak window."',
    },
    {
      step: '4',
      icon: CheckCircle,
      title: 'Close the Loops',
      description: 'Turn Red (Struggling) topics into Green (Mastered) using auto-generated Active Recall quizzes.',
    },
  ];

  return (
    <section id="atlas" className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <Brain size={20} className="text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Atlas Intelligence™</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Meet Atlas. Your Personal <br className="hidden md:block" />Metacognitive Coach.
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            4 Algorithms working in the background to ensure you never miss a mark.
          </p>
        </div>

        {/* Atlas Algorithms Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {atlasAlgorithms.map((algo, index) => {
            const IconComponent = algo.icon;
            return (
              <div 
                key={index} 
                className={`bg-card rounded-2xl p-8 border ${algo.borderColor} ${algo.hoverBorder} shadow-sm hover:shadow-lg transition-all duration-300 group`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-14 h-14 ${algo.bgColor} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <IconComponent size={28} className={algo.iconColor} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className={`inline-block px-3 py-1 ${algo.bgColor} rounded-full`}>
                      <span className={`text-xs font-bold font-cta ${algo.iconColor}`}>{algo.headline}</span>
                    </div>
                    <h3 className="text-xl font-bold font-headline text-primary">{algo.title}</h3>
                    <p className="text-text-secondary font-body leading-relaxed">{algo.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* How It Works - New Coach Workflow */}
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-sm">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold font-headline text-primary mb-4">How It Works</h3>
            <p className="text-text-secondary font-body">From upload to mastery in 4 simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="text-center space-y-4 relative">
                  {/* Connector Line */}
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-accent/50 to-accent/10"></div>
                  )}
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-accent-foreground">{item.step}</span>
                      </div>
                      <IconComponent size={28} className="text-accent" />
                    </div>
                    <h4 className="text-lg font-bold font-headline text-primary mb-2">{item.title}</h4>
                    <p className="text-sm text-text-secondary font-body">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-12 pt-8 border-t border-border">
            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-accent text-accent-foreground font-bold font-cta rounded-xl transition-all duration-250 hover:bg-accent/90 hover:shadow-lg hover:scale-105"
            >
              <Brain size={20} />
              <span>Start Your Knowledge Audit</span>
            </Link>
            <p className="text-sm text-text-secondary font-body mt-4">Free to start • No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;