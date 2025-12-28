'use client';

import { useState } from 'react';
import { Sparkles, FileText, Layers, Brain, Clock, CheckCircle, Zap, Share2, Bell } from 'lucide-react';

const FeaturesSection = () => {
  const [activeTab, setActiveTab] = useState('notes');

  const features = [
    {
      id: 'notes',
      icon: FileText,
      title: 'Smart Notes',
      headline: 'Your Messy Notes → Actionable Study Material',
      description: 'Dump your lecture slides, PDFs, or handwritten notes. Atlas instantly processes them and extracts key concepts with citations.',
      benefits: [
        'Upload PDFs, Word docs, or write directly',
        'AI extracts key concepts automatically',
        'Maintains citations for academic integrity',
        'Atlas flags missing syllabus topics immediately',
      ],
      color: 'emerald',
    },
    {
      id: 'flashcards',
      icon: Layers,
      title: 'Active Recall',
      headline: 'Auto-Generated Flashcards That Actually Stick',
      description: 'One click creates flashcards from your notes. Spaced repetition ensures you review at the perfect moment—right before you forget.',
      benefits: [
        'Generates question-answer pairs instantly',
        'Spaced repetition based on your performance',
        'Knowledge Heatmap shows untested concepts',
        'Share with friends via secure link',
      ],
      color: 'purple',
    },
    {
      id: 'schedule',
      icon: Clock,
      title: 'Smart Scheduling',
      headline: 'Study at Your Biological Peak',
      description: "Atlas analyzes your accuracy by hour to find your \"Golden Window\"—the 3 hours where your brain learns 2x faster. No more tired studying.",
      benefits: [
        'Biological Rhythm analysis finds your peak hours',
        'Adaptive scheduling based on exam dates',
        'Morning Reports tell you what to study today',
        'Calendar integration with reminders',
      ],
      color: 'blue',
    },
    {
      id: 'atlas',
      icon: Brain,
      title: 'Atlas Intelligence',
      headline: 'Your 24/7 Metacognitive Coach',
      description: "Atlas doesn't just store your data—it actively audits your knowledge. Wake up to a personalized briefing on what's decaying and what needs attention.",
      benefits: [
        'Content Gap Audit catches missing topics',
        'Forgetting Curve predicts memory decay',
        'Morning Reports prioritize your study time',
        'Red → Green loop closes knowledge gaps',
      ],
      color: 'orange',
    },
  ];

  const activeFeature = features.find((f) => f.id === activeTab) || features[0];

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      border: 'border-purple-500',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      border: 'border-blue-500',
    },
    orange: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-500',
      border: 'border-orange-500',
    },
  };

  return (
    <section id="features" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
            <Sparkles size={20} className="text-secondary" />
            <span className="text-sm font-semibold font-cta text-secondary">Core Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Built for How You Actually Learn
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Not just tools—a complete learning ecosystem powered by Atlas Intelligence.
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border">
            {features.map((feature) => {
              const colors = colorClasses[feature.color as keyof typeof colorClasses];
              const isActive = activeTab === feature.id;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`p-4 md:p-6 text-center transition-all duration-250 ${
                    isActive
                      ? `bg-muted/50 border-b-2 ${colors.border}`
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-10 h-10 ${isActive ? colors.bg : 'bg-muted/50'} rounded-xl flex items-center justify-center`}>
                      <feature.icon
                        size={20}
                        className={isActive ? colors.text : 'text-text-secondary'}
                      />
                    </div>
                    <span className={`text-sm font-medium font-body ${
                      isActive ? 'text-primary' : 'text-text-secondary'
                    }`}>
                      {feature.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Feature Content */}
          <div className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Content */}
              <div className="space-y-6">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 ${colorClasses[activeFeature.color as keyof typeof colorClasses].bg} rounded-full`}>
                  <activeFeature.icon size={16} className={colorClasses[activeFeature.color as keyof typeof colorClasses].text} />
                  <span className={`text-xs font-bold font-cta ${colorClasses[activeFeature.color as keyof typeof colorClasses].text}`}>
                    {activeFeature.title}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-headline text-primary">
                  {activeFeature.headline}
                </h3>
                <p className="text-lg text-text-secondary font-body">
                  {activeFeature.description}
                </p>
                <ul className="space-y-3">
                  {activeFeature.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-success mt-0.5 flex-shrink-0" />
                      <span className="text-text-primary font-body">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Visual */}
              <div className={`${colorClasses[activeFeature.color as keyof typeof colorClasses].bg} rounded-2xl p-8 flex items-center justify-center min-h-[300px]`}>
                <div className="text-center space-y-4">
                  <div className={`w-24 h-24 ${colorClasses[activeFeature.color as keyof typeof colorClasses].bg} rounded-3xl flex items-center justify-center mx-auto border-2 ${colorClasses[activeFeature.color as keyof typeof colorClasses].border} border-dashed`}>
                    <activeFeature.icon size={48} className={colorClasses[activeFeature.color as keyof typeof colorClasses].text} />
                  </div>
                  <p className={`text-sm font-medium font-body ${colorClasses[activeFeature.color as keyof typeof colorClasses].text}`}>
                    {activeFeature.title} Powered by Atlas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { icon: Zap, stat: '<30s', label: 'Note Processing' },
            { icon: Layers, stat: '1-Click', label: 'Flashcard Generation' },
            { icon: Share2, stat: 'Free', label: 'Friend Sharing' },
            { icon: Bell, stat: 'Daily', label: 'Morning Reports' },
          ].map((item, index) => (
            <div key={index} className="bg-card rounded-xl p-4 border border-border text-center">
              <item.icon size={20} className="text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold font-headline text-primary">{item.stat}</div>
              <div className="text-xs text-text-secondary font-body">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;