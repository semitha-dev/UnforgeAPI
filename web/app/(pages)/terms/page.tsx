'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, FileText, CreditCard, Mail } from 'lucide-react'

export default function TermsPage() {
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
              <Image src="/reallogo.png" alt="LeafLearning" width={32} height={32} className="object-contain" />
            </div>
            <span className="font-bold font-headline text-text-primary">LeafLearning</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4">
            Legal Policies
          </h1>
          <p className="text-lg text-text-secondary font-body">
            Last Updated: January 15, 2025
          </p>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 border-b border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="#terms" className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-accent hover:shadow-card transition-all">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-medium font-body text-text-primary">Terms of Service</span>
            </a>
            <a href="#privacy" className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-success hover:shadow-card transition-all">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium font-body text-text-primary">Privacy Policy</span>
            </a>
            <a href="#refund" className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-secondary hover:shadow-card transition-all">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-sm font-medium font-body text-text-primary">Refund Policy</span>
            </a>
            <a href="#contact" className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-card transition-all">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium font-body text-text-primary">Contact</span>
            </a>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          
          {/* Terms of Service */}
          <div id="terms" className="scroll-mt-24">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold font-headline text-primary">1. Terms of Service</h2>
              </div>

              <div className="space-y-6 text-text-secondary font-body leading-relaxed">
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Acceptance of Terms</h3>
                  <p>By creating an account or using LeafLearning, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you must stop using the platform immediately.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Eligibility</h3>
                  <p>You must be at least <strong className="text-text-primary">18 years old</strong> to create an account and use LeafLearning. By creating an account, you confirm that you are at least 18 years of age. Minors are not permitted to use this service.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Service Description</h3>
                  <p>LeafLearning is an AI-powered study companion.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                    <li><strong className="text-text-primary">AI Provider:</strong> Our AI features are powered by Groq (Llama models). Your input data will be processed by these AI APIs.</li>
                    <li><strong className="text-text-primary">Nature of AI:</strong> AI is probabilistic. LeafLearning does not guarantee that summaries, citations, or answers are 100% accurate, complete, or unbiased.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Data Handling & User Content</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong className="text-text-primary">Your Ownership:</strong> You retain ownership of all notes and files you upload.</li>
                    <li><strong className="text-text-primary">PDF Processing:</strong> LeafLearning does not store the PDF files you upload. They are processed temporarily and immediately discarded.</li>
                    <li><strong className="text-text-primary">Stored Content:</strong> We store only the text input you manually enter and the output generated by the AI (flashcards, quizzes, etc.).</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Token System</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong className="text-text-primary">Token Validity:</strong> Tokens are valid for the period specified at the time of purchase. LeafLearning reserves the right to modify token expiration policies at its discretion.</li>
                    <li><strong className="text-text-primary">Non-Transferable:</strong> Tokens cannot be transferred to other accounts or exchanged for cash.</li>
                    <li><strong className="text-text-primary">Free Tier:</strong> New users receive 500 complimentary tokens upon registration.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Academic Integrity</h3>
                  <p>LeafLearning is for learning assistance. You agree NOT to use AI-generated text to commit plagiarism or submit AI-generated citations without verifying them against primary sources.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Limitation of Liability</h3>
                  <p>The Service is provided "AS IS." LeafLearning is not liable for academic consequences (failing grades), loss of data, or AI "hallucinations." You are solely responsible for verifying the accuracy of all materials.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Governing Law</h3>
                  <p>These terms are governed by the laws of Sri Lanka. Any disputes shall be resolved in the courts of Sri Lanka.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Policy */}
          <div id="privacy" className="scroll-mt-24">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <h2 className="text-2xl font-bold font-headline text-primary">2. Privacy Policy</h2>
              </div>

              <div className="space-y-6 text-text-secondary font-body leading-relaxed">
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Information We Collect</h3>
                  <p>Account Data (Email/Username), Study Data (Notes/Quizzes), and Usage Analytics.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Payments</h3>
                  <p>We do not store credit card details. All transactions are processed by Polar.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Third-Party Disclosure</h3>
                  <p>We share text data with Groq AI strictly for content generation. We do not sell your data to advertisers.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Data Deletion</h3>
                  <p>You may request full account deletion at any time. Upon deletion, all notes, progress, and token balances are permanently removed.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">International Transfers</h3>
                  <p>Your data may be processed in servers located in Sri Lanka or where our third-party providers (Groq, Polar) operate.</p>
                </div>

                <p className="pt-4">
                  For our complete privacy policy, please visit our{' '}
                  <Link href="/privacy" className="text-accent hover:underline font-medium">Privacy Policy page</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Refund Policy */}
          <div id="refund" className="scroll-mt-24">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold font-headline text-primary">3. Refund Policy</h2>
              </div>

              <div className="space-y-6 text-text-secondary font-body leading-relaxed">
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Digital Goods</h3>
                  <p>Since tokens grant immediate access to AI features, all purchases are final and non-refundable.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Token Expiration</h3>
                  <p>Tokens are subject to the expiration terms active at the time of purchase. Check your dashboard for current validity periods.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Technical Errors</h3>
                  <p>If a payment error occurs with Polar, contact support to have your tokens manually credited.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Exceptions</h3>
                  <p>We may consider refunds on a case-by-case basis for:</p>
                  <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                    <li>Duplicate charges due to technical errors</li>
                    <li>Service unavailability for extended periods</li>
                    <li>Unauthorized transactions (with proper documentation)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Support */}
          <div id="contact" className="scroll-mt-24">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-headline text-primary">4. Contact & Support</h2>
              </div>

              <div className="text-text-secondary font-body leading-relaxed">
                <p className="mb-6">For legal inquiries or support, please contact us:</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="mailto:support@leaflearning.app" 
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                  >
                    <Mail className="w-4 h-4 text-text-primary" />
                    <span className="font-medium text-text-primary">support@leaflearning.app</span>
                  </a>
                  <Link 
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors"
                  >
                    Contact Form
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold font-headline text-primary mb-4">Ready to Start Learning?</h2>
          <p className="text-text-secondary font-body mb-6">
            Join thousands of students using AI to study smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link 
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold font-cta hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
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
