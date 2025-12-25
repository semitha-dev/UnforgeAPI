'use client'

import Link from 'next/link'
import { ArrowLeft, Leaf, Users, Target, Heart, Sparkles, GraduationCap, Globe } from 'lucide-react'

export default function AboutPage() {
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
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold font-headline text-text-primary">LeafLearning</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">About Us</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
            Empowering Students to Learn Smarter
          </h1>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            LeafLearning was built with one mission: to make quality education accessible and effective for every student, everywhere.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-3xl font-bold font-headline text-primary">Our Mission</h2>
              </div>
              <p className="text-text-secondary font-body mb-4">
                We believe that every student deserves access to powerful learning tools that adapt to their unique needs. Traditional studying methods are time-consuming and often ineffective.
              </p>
              <p className="text-text-secondary font-body">
                LeafLearning uses artificial intelligence to transform how students study—automatically generating flashcards, quizzes, and summaries from any learning material in seconds, not hours.
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border shadow-card">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4">
                  <div className="text-4xl font-bold font-headline text-accent mb-2">10x</div>
                  <p className="text-sm text-text-secondary font-body">Faster Study Prep</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold font-headline text-accent mb-2">500+</div>
                  <p className="text-sm text-text-secondary font-body">Active Students</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold font-headline text-accent mb-2">95%</div>
                  <p className="text-sm text-text-secondary font-body">User Satisfaction</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-4xl font-bold font-headline text-accent mb-2">24/7</div>
                  <p className="text-sm text-text-secondary font-body">AI Availability</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-card transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold font-headline text-primary mb-3">Student-First</h3>
              <p className="text-text-secondary font-body">
                Every feature we build starts with one question: "How does this help students learn better?"
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-card transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold font-headline text-primary mb-3">Innovation</h3>
              <p className="text-text-secondary font-body">
                We leverage cutting-edge AI to create tools that weren't possible just a few years ago.
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-card transition-shadow">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-xl font-bold font-headline text-primary mb-3">Accessibility</h3>
              <p className="text-text-secondary font-body">
                Quality education tools should be affordable. That's why we offer a generous free tier and fair pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold font-headline text-primary mb-4">Built by Students, for Students</h2>
          <p className="text-text-secondary font-body max-w-2xl mx-auto mb-8">
            LeafLearning was created by a passionate team who experienced firsthand the challenges of modern education. We're committed to building the study tools we wish we had.
          </p>
          <Link 
            href="/careers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors"
          >
            <GraduationCap className="w-5 h-5" />
            Join Our Team
          </Link>
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
