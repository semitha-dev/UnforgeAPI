'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield } from 'lucide-react'

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
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            </div>
            <span className="font-bold font-headline text-text-primary">UnforgeAPI</span>
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
            Last updated: January 27, 2026
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
                UnforgeAPI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our API services. Please read this policy carefully. By using UnforgeAPI, you consent to the practices described in this Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Information We Collect</h2>
              <div className="space-y-4 text-text-secondary font-body leading-relaxed">
                <p><strong className="text-text-primary">Account Information:</strong> When you create an account, we collect your email address and, optionally, your name and profile picture.</p>
                <p><strong className="text-text-primary">API Usage Data:</strong> We automatically collect information about your API usage, including request counts, endpoints accessed, response times, and error rates.</p>
                <p><strong className="text-text-primary">Query Data:</strong> When you submit queries to our API, we process this content in real-time to provide research results. Query content is not permanently stored beyond rate limiting and usage tracking purposes.</p>
                <p><strong className="text-text-primary">Payment Information:</strong> If you subscribe to a paid plan, payment information is processed by our payment provider (Polar). We do not store your full credit card details.</p>
                <p><strong className="text-text-primary">Device Information:</strong> We may collect information about the device or server making API requests, including IP address, user agent, and request headers.</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-text-secondary font-body leading-relaxed">
                <li>To provide, maintain, and improve our API services</li>
                <li>To process API requests and deliver research results</li>
                <li>To enforce rate limits and usage quotas</li>
                <li>To process subscription payments and billing</li>
                <li>To send you technical notices, updates, and support messages</li>
                <li>To respond to your comments, questions, and requests</li>
                <li>To monitor and analyze API performance and usage patterns</li>
                <li>To detect, prevent, and address abuse, technical issues, and fraud</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">AI Processing</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                Our service uses artificial intelligence to perform deep research and generate structured outputs from your queries. Your queries are processed by AI providers including Groq, Gemini, and Tavily. These providers have strict data handling policies. Your query data is not used to train AI models.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">BYOK (Bring Your Own Keys)</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                If you use the BYOK feature, your API keys for third-party services (Groq, Gemini, Tavily) are stored securely and encrypted. These keys are only used to process your API requests and are never shared with other users or third parties. You can delete your stored keys at any time through your account settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Sharing</h2>
              <div className="space-y-4 text-text-secondary font-body leading-relaxed">
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties except as described below:</p>
                <p><strong className="text-text-primary">AI Service Providers:</strong> We share query data with AI providers (Groq, Gemini, Tavily) strictly for processing your API requests.</p>
                <p><strong className="text-text-primary">Payment Processors:</strong> Subscription and payment data is shared with Polar for billing purposes.</p>
                <p><strong className="text-text-primary">Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities.</p>
                <p><strong className="text-text-primary">Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Security</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We implement industry-standard security measures to protect your information. This includes encryption of data in transit (TLS 1.3) and at rest (AES-256), secure API key storage, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Data Retention</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We retain your account information for as long as your account is active or as needed to provide you services. API usage logs are retained for 90 days for analytics and debugging purposes. You can request deletion of your data at any time by contacting us or through your account settings. We may retain certain information as required by law or for legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Your Rights</h2>
              <ul className="list-disc list-inside space-y-2 text-text-secondary font-body leading-relaxed">
                <li><strong className="text-text-primary">Access:</strong> You can request a copy of your personal data</li>
                <li><strong className="text-text-primary">Correction:</strong> You can update or correct your account information</li>
                <li><strong className="text-text-primary">Deletion:</strong> You can request deletion of your account and data</li>
                <li><strong className="text-text-primary">API Key Management:</strong> You can regenerate or delete your API keys at any time</li>
                <li><strong className="text-text-primary">Opt-out:</strong> You can unsubscribe from marketing communications</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Children&apos;s Privacy</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                Our services are not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">International Users</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                UnforgeAPI is operated from Sri Lanka. If you are accessing our services from outside Sri Lanka, please be aware that your information may be transferred to, stored, and processed in Sri Lanka or other jurisdictions where our service providers operate, which may have different data protection laws than your own.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Changes to This Policy</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Contact Us</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:support@unforgeapi.com" className="text-accent hover:underline">
                  support@unforgeapi.com
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
            © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
