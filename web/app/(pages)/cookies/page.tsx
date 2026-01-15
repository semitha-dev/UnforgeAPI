'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Cookie } from 'lucide-react'

export default function CookiesPage() {
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
            <Cookie className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Cookie Policy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4">
            Cookie Policy
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
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">What Are Cookies?</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners. Cookies help us understand how you use our website and improve your experience.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">How We Use Cookies</h2>
              <p className="text-text-secondary font-body leading-relaxed mb-4">
                LeafLearning uses cookies for several purposes:
              </p>
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h3 className="font-bold font-headline text-primary mb-2">Essential Cookies</h3>
                  <p className="text-text-secondary font-body text-sm">
                    These cookies are necessary for the website to function properly. They enable core functionality such as security, authentication, and session management. You cannot opt out of these cookies.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h3 className="font-bold font-headline text-primary mb-2">Functional Cookies</h3>
                  <p className="text-text-secondary font-body text-sm">
                    These cookies enable personalized features and remember your preferences, such as your language choice, theme settings, and login status. They make your experience more convenient.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h3 className="font-bold font-headline text-primary mb-2">Analytics Cookies</h3>
                  <p className="text-text-secondary font-body text-sm">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and services.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h3 className="font-bold font-headline text-primary mb-2">Performance Cookies</h3>
                  <p className="text-text-secondary font-body text-sm">
                    These cookies collect information about how you use our website, such as which pages you visit most often. This data helps us optimize website performance and user experience.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 font-bold font-headline text-primary">Cookie Name</th>
                      <th className="py-3 px-4 font-bold font-headline text-primary">Purpose</th>
                      <th className="py-3 px-4 font-bold font-headline text-primary">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary font-body text-sm">
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">sb-auth-token</td>
                      <td className="py-3 px-4">Authentication session</td>
                      <td className="py-3 px-4">7 days</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">user-preferences</td>
                      <td className="py-3 px-4">Theme and display settings</td>
                      <td className="py-3 px-4">1 year</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">country-cache</td>
                      <td className="py-3 px-4">Currency display preferences</td>
                      <td className="py-3 px-4">24 hours</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">_ga</td>
                      <td className="py-3 px-4">Google Analytics (if enabled)</td>
                      <td className="py-3 px-4">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Third-Party Cookies</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We may use third-party services that set cookies on your device. These include:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-text-secondary font-body leading-relaxed">
                <li><strong className="text-text-primary">Supabase:</strong> Authentication and session management</li>
                <li><strong className="text-text-primary">Stripe:</strong> Secure payment processing (only when making purchases)</li>
                <li><strong className="text-text-primary">Analytics:</strong> Website usage analytics (anonymized)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Managing Cookies</h2>
              <p className="text-text-secondary font-body leading-relaxed mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc list-inside space-y-2 text-text-secondary font-body leading-relaxed">
                <li><strong className="text-text-primary">Browser Settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites.</li>
                <li><strong className="text-text-primary">Private Browsing:</strong> You can use your browser's private or incognito mode to prevent cookies from being stored.</li>
                <li><strong className="text-text-primary">Opt-out Tools:</strong> For analytics cookies, you can use tools like the Google Analytics Opt-out Browser Add-on.</li>
              </ul>
              <p className="text-text-secondary font-body leading-relaxed mt-4">
                Please note that disabling certain cookies may affect the functionality of our website and limit your access to some features.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Local Storage</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                In addition to cookies, we may use local storage technologies (such as localStorage) to store information on your device. This data is used to improve performance and remember your preferences. Local storage is similar to cookies but can store larger amounts of data and is not sent to the server with every request.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Updates to This Policy</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Please check this page periodically for updates. The "Last updated" date at the top indicates when this policy was last revised.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-headline text-primary mb-4">Contact Us</h2>
              <p className="text-text-secondary font-body leading-relaxed">
                If you have any questions about our use of cookies, please contact us at{' '}
                <a href="mailto:privacy@leaflearning.app" className="text-accent hover:underline">
                  privacy@leaflearning.app
                </a>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold font-headline text-primary mb-4">Related Policies</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/privacy"
              className="px-6 py-3 bg-card border border-border rounded-xl font-medium font-body text-text-primary hover:border-accent transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms"
              className="px-6 py-3 bg-card border border-border rounded-xl font-medium font-body text-text-primary hover:border-accent transition-colors"
            >
              Terms of Service
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
