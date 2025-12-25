'use client'

import Link from 'next/link'
import { ArrowLeft, Leaf, Shield } from 'lucide-react'

export default function PrivacyPage() {
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
      <section className="py-16 bg-gradient-to-br from-accent/5 via-background to-secondary/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20 mb-6">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Privacy Policy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4">
            Your Privacy Matters
          </h1>
          <p className="text-lg text-text-secondary font-body">
            Last updated: January 15, 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-card rounded-2xl border border-border p-8 md:p-12 space-y-8">
            
            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Introduction</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                LeafLearning ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this policy carefully. By using LeafLearning, you consent to the practices described in this Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Information We Collect</h2>
              <div className="space-y-4 text-text-secondary font-body leading-relaxed">
                <p><strong className="text-text-primary">Personal Information:</strong> When you create an account, we collect your email address and, optionally, your name and profile picture.</p>
                <p><strong className="text-text-primary">Usage Data:</strong> We automatically collect information about how you interact with our services, including pages visited, features used, and time spent studying.</p>
                <p><strong className="text-text-primary">Study Materials:</strong> When you upload notes, PDFs, or other study materials, we store this content securely to provide our services.</p>
                <p><strong className="text-text-primary">Payment Information:</strong> If you make a purchase, payment information is processed by our payment provider (Stripe). We do not store your full credit card details.</p>
                <p><strong className="text-text-primary">Device Information:</strong> We may collect information about the device you use to access our services, including device type, operating system, and browser type.</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-text-secondary font-body leading-relaxed">
                <li>To provide, maintain, and improve our services</li>
                <li>To process transactions and send related information</li>
                <li>To send you technical notices, updates, and support messages</li>
                <li>To respond to your comments, questions, and requests</li>
                <li>To personalize your learning experience</li>
                <li>To monitor and analyze trends, usage, and activities</li>
                <li>To detect, prevent, and address technical issues and fraud</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">AI Processing</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                Our service uses artificial intelligence to generate flashcards, quizzes, and summaries from your study materials. Your content is processed by AI models to provide these features. We use industry-leading AI providers with strict data handling policies. Your study materials are not used to train AI models.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Sharing</h2>
              <div className="space-y-4 text-text-secondary font-body leading-relaxed">
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties except as described below:</p>
                <p><strong className="text-text-primary">Service Providers:</strong> We may share information with third-party vendors who perform services on our behalf, such as payment processing, data analysis, and email delivery.</p>
                <p><strong className="text-text-primary">Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities.</p>
                <p><strong className="text-text-primary">Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Security</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We implement industry-standard security measures to protect your information. This includes encryption of data in transit (TLS 1.3) and at rest (AES-256), secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Retention</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide you services. You can request deletion of your data at any time by contacting us or through your account settings. We may retain certain information as required by law or for legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Your Rights</h2>
              <ul className="list-disc list-inside space-y-2 text-text-secondary font-body leading-relaxed">
                <li><strong className="text-text-primary">Access:</strong> You can request a copy of your personal data</li>
                <li><strong className="text-text-primary">Correction:</strong> You can update or correct your information</li>
                <li><strong className="text-text-primary">Deletion:</strong> You can request deletion of your account and data</li>
                <li><strong className="text-text-primary">Export:</strong> You can export your flashcards and study materials</li>
                <li><strong className="text-text-primary">Opt-out:</strong> You can unsubscribe from marketing communications</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Children's Privacy</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">International Users</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                LeafLearning is operated from various locations worldwide. If you are accessing our services from outside your country, please be aware that your information may be transferred to, stored, and processed in different jurisdictions with different data protection laws than your own.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Changes to This Policy</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Contact Us</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@leaflearning.app" className="text-accent hover:underline">
                  privacy@leaflearning.app
                </a>
              </p>
            </div>

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
