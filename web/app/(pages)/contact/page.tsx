'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, MessageSquare, MapPin, Clock, Send } from 'lucide-react'

export default function ContactPage() {
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
              <Image src="/new_logo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-bold font-headline text-text-primary">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Contact Us</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
            We'd Love to Hear From You
          </h1>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto">
            Have a question, feedback, or just want to say hi? We're here to help.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-card rounded-2xl p-8 border border-border text-center hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-bold font-headline text-primary mb-2">Email Us</h3>
              <p className="text-sm text-text-secondary font-body mb-4">For general inquiries and support</p>
              <a href="mailto:support@UnforgeAPI.app" className="text-accent font-medium hover:underline">
                support@UnforgeAPI.app
              </a>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border text-center hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-lg font-bold font-headline text-primary mb-2">Response Time</h3>
              <p className="text-sm text-text-secondary font-body mb-4">We typically respond within</p>
              <span className="text-secondary font-bold">24-48 hours</span>
            </div>
            <div className="bg-card rounded-2xl p-8 border border-border text-center hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-lg font-bold font-headline text-primary mb-2">Location</h3>
              <p className="text-sm text-text-secondary font-body mb-4">We're a fully remote team</p>
              <span className="text-success font-bold">Worldwide 🌍</span>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
              <h2 className="text-2xl font-bold font-headline text-primary mb-6 text-center">Send Us a Message</h2>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary font-body mb-2">Name</label>
                    <input 
                      type="text"
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary font-body focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary font-body mb-2">Email</label>
                    <input 
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary font-body focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary font-body mb-2">Subject</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary font-body focus:outline-none focus:border-accent transition-colors">
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Billing Question</option>
                    <option>Feature Request</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary font-body mb-2">Message</label>
                  <textarea 
                    rows={5}
                    placeholder="How can we help you?"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary font-body focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold font-headline text-primary mb-4">Looking for Quick Answers?</h2>
          <p className="text-text-secondary font-body mb-6">
            Check out our FAQ section for commonly asked questions.
          </p>
          <Link 
            href="/#faq"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold font-cta hover:bg-primary/90 transition-colors"
          >
            View FAQ
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary font-body">
            © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
