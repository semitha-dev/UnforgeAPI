'use client';

import { useState } from 'react';
import { Star, FileText, Layers, Calendar, BarChart3, CheckCircle } from 'lucide-react';

const iconMap = {
  'DocumentTextIcon': FileText,
  'RectangleStackIcon': Layers,
  'CalendarDaysIcon': Calendar,
  'ChartBarIcon': BarChart3,
  'StarIcon': Star,
  'CheckCircleIcon': CheckCircle,
};

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  benefits: string[];
  image: string;
  alt: string;
}

const FeaturesSection = () => {
  const [activeTab, setActiveTab] = useState('summarizer');

  const features: Feature[] = [
  {
    id: 'summarizer',
    icon: 'DocumentTextIcon',
    title: 'AI Summarizer with Citations',
    description: 'Compress lengthy academic materials into concise summaries while preserving source citations and key concepts.',
    benefits: [
    'Maintains academic integrity with proper citations',
    'Extracts key concepts and definitions automatically',
    'Adjustable summary length (brief, moderate, detailed)',
    'Highlights critical information for exam prep'],
    image: "https://img.icons8.com/3d-fluency/500/document.png",
    alt: 'AI document summarization illustration'
  },
  {
    id: 'flashcards',
    icon: 'RectangleStackIcon',
    title: 'Automatic Flashcard Generator',
    description: 'Create study flashcards instantly from any document with spaced repetition scheduling built in.',
    benefits: [
    'Generates question-answer pairs automatically',
    'Spaced repetition algorithm for optimal retention',
    'Share flashcards via link with friends',
    'Mobile-friendly swipe interface'],
    image: "https://img.icons8.com/3d-fluency/500/cards.png",
    alt: 'Flashcard generation illustration'
  },
  {
    id: 'planner',
    icon: 'CalendarDaysIcon',
    title: 'Intelligent Exam Planner',
    description: 'Build personalized study schedules that adapt to your learning pace and exam deadlines.',
    benefits: [
    'Calendar integration with exam dates',
    'Adaptive scheduling based on progress',
    'Break reminders and study session optimization',
    'Multi-course coordination'],
    image: "https://img.icons8.com/3d-fluency/500/calendar.png",
    alt: 'Study planning calendar illustration'
  },
  {
    id: 'analytics',
    icon: 'ChartBarIcon',
    title: 'Progress Analytics Dashboard',
    description: 'Track your learning journey with detailed insights and grade improvement predictions.',
    benefits: [
    'Retention rate tracking over time',
    'Study efficiency metrics',
    'Grade improvement projections',
    'Weak area identification'],
    image: "https://img.icons8.com/3d-fluency/500/combo-chart.png",
    alt: 'Analytics dashboard illustration'
  }];


  const activeFeature = features.find((f) => f.id === activeTab) || features[0];
  const ActiveIcon = iconMap[activeFeature.icon as keyof typeof iconMap] || FileText;

  return (
    <section id="features" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
            <Star size={20} className="text-secondary fill-secondary" />
            <span className="text-sm font-semibold font-cta text-secondary">Powerful Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Everything You Need to Excel
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Comprehensive AI-powered tools designed specifically for modern students.
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="grid md:grid-cols-4 border-b border-border">
            {features.map((feature) => {
              const FeatureIcon = iconMap[feature.icon as keyof typeof iconMap] || FileText;
              return (
            <button
              key={feature.id}
              onClick={() => setActiveTab(feature.id)}
              className={`p-6 text-left transition-all duration-250 ${
              activeTab === feature.id ?
              'bg-accent/10 border-b-2 border-accent' : 'hover:bg-muted/30'}`
              }>

                <div className="flex items-center space-x-3">
                  <FeatureIcon
                    size={24}
                    className={activeTab === feature.id ? 'text-accent fill-accent' : 'text-text-secondary'} />

                  <span className={`font-medium font-body ${
                activeTab === feature.id ? 'text-primary' : 'text-text-secondary'}`
                }>
                    {feature.title.split(' ')[0]}
                  </span>
                </div>
              </button>
              );
            })}
          </div>

          <div className="p-8">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <ActiveIcon size={24} className="text-accent fill-accent" />
                </div>
                <h3 className="text-2xl font-bold font-headline text-primary">{activeFeature.title}</h3>
              </div>
              <p className="text-lg text-text-secondary font-body">{activeFeature.description}</p>
              <ul className="space-y-3 text-left inline-block">
                {activeFeature.benefits.map((benefit, index) =>
                <li key={index} className="flex items-start space-x-3">
                    <CheckCircle size={20} className="text-success fill-success mt-0.5 flex-shrink-0" />
                    <span className="text-text-primary font-body">{benefit}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>);

};

export default FeaturesSection;