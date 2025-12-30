'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Briefcase, MapPin, Clock, Code, Palette, Megaphone, Users, Send } from 'lucide-react'

const openPositions = [
  {
    id: 1,
    title: 'Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    icon: Code,
    description: 'Help build the future of AI-powered education. We\'re looking for a passionate developer experienced with Next.js, TypeScript, and modern web technologies.',
    requirements: [
      '3+ years experience with React/Next.js',
      'Strong TypeScript skills',
      'Experience with databases (PostgreSQL/Supabase)',
      'Passion for education technology'
    ]
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    icon: Palette,
    description: 'Create beautiful, intuitive experiences that help students learn better. We need someone who understands both aesthetics and user psychology.',
    requirements: [
      '2+ years product design experience',
      'Proficiency in Figma',
      'Understanding of accessibility standards',
      'Portfolio showcasing web/mobile apps'
    ]
  },
  {
    id: 3,
    title: 'Growth Marketing Manager',
    department: 'Marketing',
    location: 'Remote',
    type: 'Full-time',
    icon: Megaphone,
    description: 'Drive user acquisition and engagement for LeafLearning. Help us reach students who can benefit from our AI study tools.',
    requirements: [
      '3+ years in growth/digital marketing',
      'Experience with SEO, content marketing, paid ads',
      'Data-driven decision making',
      'EdTech experience is a plus'
    ]
  },
  {
    id: 4,
    title: 'Community Manager',
    department: 'Operations',
    location: 'Remote',
    type: 'Part-time',
    icon: Users,
    description: 'Build and nurture our student community. Engage with users, gather feedback, and help shape the product roadmap.',
    requirements: [
      'Excellent communication skills',
      'Experience managing online communities',
      'Understanding of student needs',
      'Social media savvy'
    ]
  }
]

const benefits = [
  'Competitive salary + equity',
  'Fully remote work',
  'Flexible hours',
  'Learning budget ($1,000/year)',
  'Health insurance',
  'Unlimited PTO'
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium font-body">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/new_logo.png" alt="LeafLearning" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-bold font-headline text-text-primary">LeafLearning</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <Briefcase className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Careers</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
            Join the Future of Education
          </h1>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Help us build AI-powered tools that make learning more effective for students worldwide. We're looking for passionate people who want to make a difference.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold font-headline text-primary text-center mb-8">Why Work With Us?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-card rounded-xl p-4 text-center border border-border">
                <p className="text-sm font-medium text-text-primary font-body">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold font-headline text-primary text-center mb-4">Open Positions</h2>
          <p className="text-text-secondary font-body text-center mb-12 max-w-2xl mx-auto">
            We're a small but growing team. If you don't see a perfect fit but think you'd be a great addition, we'd still love to hear from you.
          </p>
          
          <div className="space-y-6">
            {openPositions.map((position) => (
              <div key={position.id} className="bg-card rounded-2xl border border-border p-6 md:p-8 hover:shadow-card transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    <position.icon className="w-7 h-7 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xl font-bold font-headline text-primary">{position.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {position.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <a 
                        href={`mailto:careers@leaflearning.app?subject=Application for ${position.title}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        Apply Now
                      </a>
                    </div>
                    <p className="text-text-secondary font-body mb-4">{position.description}</p>
                    <div>
                      <p className="text-sm font-semibold text-text-primary mb-2">Requirements:</p>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {position.requirements.map((req, idx) => (
                          <li key={idx} className="text-sm text-text-secondary font-body flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 shrink-0"></span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-accent/10 to-secondary/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold font-headline text-primary mb-4">Don't See a Perfect Fit?</h2>
          <p className="text-text-secondary font-body mb-6 max-w-xl mx-auto">
            We're always looking for talented people. Send us your resume and tell us how you can contribute to LeafLearning.
          </p>
          <a 
            href="mailto:careers@leaflearning.app?subject=General Application"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold font-cta hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5" />
            Send General Application
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary font-body">
            © {new Date().getFullYear()} LeafLearning. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
