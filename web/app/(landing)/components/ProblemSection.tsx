'use client';

import { FileText, Clock, AlertTriangle, XCircle } from 'lucide-react';
import Image from 'next/image';

const iconMap = {
  'DocumentTextIcon': FileText,
  'ClockIcon': Clock,
  'ExclamationTriangleIcon': AlertTriangle,
};

const ProblemSection = () => {
  const problems = [
  {
    icon: 'DocumentTextIcon',
    title: 'Information Overload',
    description: 'Drowning in hundreds of pages of textbooks, lecture notes, and research papers with no efficient way to process it all.',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a3c3b3c0-1765162678258.png",
    alt: 'Stressed student surrounded by stacks of textbooks and papers at cluttered desk'
  },
  {
    icon: 'ClockIcon',
    title: 'Time Management Crisis',
    description: 'Spending 6+ hours creating study materials manually when you could be actually learning and retaining information.',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c2b8f760-1764664625232.png",
    alt: 'Clock showing late night hours with open textbooks and coffee cup on desk'
  },
  {
    icon: 'ExclamationTriangleIcon',
    title: 'Poor Retention',
    description: 'Traditional highlighting and re-reading methods proven to be ineffective, leading to cramming and forgotten material.',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b2ce61ca-1765217278352.png",
    alt: 'Frustrated student with head in hands looking at highlighted textbook pages'
  }];


  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-error/10 rounded-full border border-error/20">
            <AlertTriangle size={20} className="text-error fill-error" />
            <span className="text-sm font-semibold font-cta text-error">The Study Struggle is Real</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Traditional Studying is Broken
          </h2>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Students waste countless hours on inefficient study methods that don't match how our brains actually learn.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => {
            const IconComponent = iconMap[problem.icon as keyof typeof iconMap] || FileText;
            return (
          <div key={index} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-card transition-shadow duration-250">
              <div className="relative h-48 overflow-hidden">
                <img
                src={problem.image}
                alt={problem.alt}
                className="w-full h-full object-cover" />

                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              </div>
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                  <IconComponent size={24} className="text-error" />
                </div>
                <h3 className="text-xl font-bold font-headline text-primary">{problem.title}</h3>
                <p className="text-text-secondary font-body">{problem.description}</p>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-16 bg-muted/30 rounded-lg p-8 border-2 border-dashed border-border">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold font-headline text-primary">The Cost of Inefficiency</h3>
              <ul className="space-y-3">
                {[
                'Average student spends 17 hours/week on passive studying',
                'Only 20% retention rate from traditional methods',
                '68% of students report high stress from study workload',
                'Missing deadlines due to poor time management'].
                map((stat, index) =>
                <li key={index} className="flex items-start space-x-3">
                    <XCircle size={20} className="text-error mt-0.5 flex-shrink-0 fill-error" />
                    <span className="text-text-primary font-body">{stat}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="text-center space-y-4">
                <div className="text-5xl font-bold font-headline text-error">17hrs</div>
                <div className="text-text-secondary font-body">Wasted weekly on inefficient studying</div>
                <div className="pt-4 border-t border-border">
                  <div className="text-3xl font-bold font-headline text-accent">→ 2hrs</div>
                  <div className="text-text-secondary font-body mt-2">With AI-powered learning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

};

export default ProblemSection;