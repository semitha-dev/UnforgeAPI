'use client';

import { Lightbulb, Sparkles, Copy, Calendar, BarChart3, BadgeCheck, Zap, Upload, Cpu, Rocket } from 'lucide-react';

const iconMap = {
  'SparklesIcon': Sparkles,
  'DocumentDuplicateIcon': Copy,
  'CalendarIcon': Calendar,
  'ChartBarIcon': BarChart3,
  'LightBulbIcon': Lightbulb,
  'CheckBadgeIcon': BadgeCheck,
  'BoltIcon': Zap,
  'ArrowUpTrayIcon': Upload,
  'CpuChipIcon': Cpu,
  'RocketLaunchIcon': Rocket,
};

const SolutionSection = () => {
  const capabilities = [
    {
      icon: 'SparklesIcon',
      title: 'AI Document Processor',
      description: 'Upload any PDF, Word doc, or text file and watch AI extract key concepts, create summaries, and preserve citations automatically.',
      accuracy: '98.5%',
      speed: '< 30 seconds'
    },
    {
      icon: 'DocumentDuplicateIcon',
      title: 'Smart Flashcard Generator',
      description: 'Automatically creates flashcards from your materials with spaced repetition scheduling and difficulty adjustment.',
      accuracy: '96.2%',
      speed: '< 15 seconds'
    },
    {
      icon: 'CalendarIcon',
      title: 'Adaptive Study Planner',
      description: 'Builds personalized study schedules based on your exam dates, learning pace, and retention patterns.',
      accuracy: '94.8%',
      speed: 'Instant'
    },
    {
      icon: 'ChartBarIcon',
      title: 'Progress Analytics',
      description: 'Track your learning journey with detailed insights, retention rates, and grade improvement predictions.',
      accuracy: '97.1%',
      speed: 'Real-time'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
            <Lightbulb size={20} className="text-accent fill-accent" />
            <span className="text-sm font-semibold font-cta text-accent">AI-Powered Solution</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Your Complete Study Companion
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            LeafLearning combines cutting-edge AI with proven learning science to transform how you study.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {capabilities.map((capability, index) => {
            const IconComponent = iconMap[capability.icon as keyof typeof iconMap] || Sparkles;
            return (
            <div key={index} className="bg-card rounded-lg p-8 border border-border shadow-sm hover:shadow-card transition-all duration-250">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconComponent size={28} className="text-accent fill-accent" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-bold font-headline text-primary">{capability.title}</h3>
                  <p className="text-text-secondary font-body">{capability.description}</p>
                  <div className="flex items-center space-x-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <BadgeCheck size={16} className="text-success fill-success" />
                      <span className="text-sm font-medium font-body text-text-primary">{capability.accuracy} Accuracy</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap size={16} className="text-warning fill-warning" />
                      <span className="text-sm font-medium font-body text-text-primary">{capability.speed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="bg-card rounded-lg p-8 border-2 border-accent/20 shadow-card">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-2xl font-bold font-headline text-primary">How It Works</h3>
              <ol className="space-y-4">
                {[
                  { step: '1', text: 'Upload your study materials (PDFs, docs, notes)', icon: Upload },
                  { step: '2', text: 'AI processes and extracts key concepts with citations', icon: Cpu },
                  { step: '3', text: 'Generate flashcards, summaries, and quizzes instantly', icon: Sparkles },
                  { step: '4', text: 'Study with adaptive scheduling and track progress', icon: BarChart3 }
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold font-cta text-accent-foreground">{item.step}</span>
                    </div>
                    <div className="flex items-center space-x-3 flex-1">
                      <item.icon size={20} className="text-accent" />
                      <span className="text-text-primary font-body">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg p-6 text-center space-y-4">
              <Rocket size={48} className="text-accent mx-auto fill-accent" />
              <div className="text-4xl font-bold font-headline text-primary">10X</div>
              <div className="text-text-secondary font-body">Faster Learning</div>
              <div className="text-sm text-text-secondary font-body">Compared to traditional methods</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;