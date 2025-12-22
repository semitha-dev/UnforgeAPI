'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, FileText, CreditCard, Mail } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-gray-900">LeafLearning</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Legal Policies</h1>
          <p className="text-gray-600">Last Updated: December 22, 2025</p>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <a href="#terms" className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all">
            <FileText className="w-6 h-6 text-orange-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Terms of Service</span>
          </a>
          <a href="#privacy" className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <Shield className="w-6 h-6 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Privacy Policy</span>
          </a>
          <a href="#refund" className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <CreditCard className="w-6 h-6 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Refund Policy</span>
          </a>
          <a href="#contact" className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <Mail className="w-6 h-6 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Contact</span>
          </a>
        </div>

        {/* Terms of Service */}
        <section id="terms" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">1. Terms of Service</h2>
            </div>

            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Acceptance of Terms</h3>
                <p>By creating an account or using LeafLearning, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you must stop using the platform immediately.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Eligibility</h3>
                <p>You must be at least <strong>18 years old</strong> to create an account and use LeafLearning. By creating an account, you confirm that you are at least 18 years of age. Minors are not permitted to use this service.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Service Description</h3>
                <p>LeafLearning is an AI-powered study companion.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li><strong>AI Provider:</strong> Our AI features are powered by Google Gemini. Your input data will be processed by Gemini's API.</li>
                  <li><strong>Nature of AI:</strong> AI is probabilistic. LeafLearning does not guarantee that summaries, citations, or answers are 100% accurate, complete, or unbiased.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data Handling & User Content</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Your Ownership:</strong> You retain ownership of all notes and files you upload.</li>
                  <li><strong>PDF Processing:</strong> LeafLearning does not store the PDF files you upload. They are processed temporarily and immediately discarded.</li>
                  <li><strong>Stored Content:</strong> We store only the text input you manually enter and the output generated by the AI (flashcards, quizzes, etc.).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Token System</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Token Validity:</strong> Tokens are valid for the period specified at the time of purchase. LeafLearning reserves the right to modify token expiration policies at its discretion.</li>
                  <li><strong>Non-Transferable:</strong> Tokens cannot be transferred to other accounts or exchanged for cash.</li>
                  <li><strong>Free Tier:</strong> New users receive 500 complimentary tokens upon registration.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Academic Integrity</h3>
                <p>LeafLearning is for learning assistance. You agree NOT to use AI-generated text to commit plagiarism or submit AI-generated citations without verifying them against primary sources.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Limitation of Liability</h3>
                <p>The Service is provided "AS IS." LeafLearning is not liable for academic consequences (failing grades), loss of data, or AI "hallucinations." You are solely responsible for verifying the accuracy of all materials.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Governing Law</h3>
                <p>These terms are governed by the laws of Sri Lanka. Any disputes shall be resolved in the courts of Sri Lanka.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Policy */}
        <section id="privacy" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">2. Privacy Policy</h2>
            </div>

            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Information We Collect</h3>
                <p>Account Data (Email/Username), Study Data (Notes/Quizzes), and Usage Analytics.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Payments</h3>
                <p>We do not store credit card details. All transactions are processed by Polar.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Third-Party Disclosure</h3>
                <p>We share text data with Google Gemini strictly for content generation. We do not sell your data to advertisers.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data Deletion</h3>
                <p>You may request full account deletion at any time. Upon deletion, all notes, progress, and token balances are permanently removed.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">International Transfers</h3>
                <p>Your data may be processed in servers located in Sri Lanka or where our third-party providers (Google, Polar) operate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Refund Policy */}
        <section id="refund" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">3. Refund Policy</h2>
            </div>

            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Digital Goods</h3>
                <p>Since tokens grant immediate access to AI features, all purchases are final and non-refundable.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Token Expiration</h3>
                <p>Tokens are subject to the expiration terms active at the time of purchase. Check your dashboard for current validity periods.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Technical Errors</h3>
                <p>If a payment error occurs with Polar, contact support to have your tokens manually credited.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & Support */}
        <section id="contact" className="mb-12 scroll-mt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">4. Contact & Support</h2>
            </div>

            <div className="text-gray-700">
              <p className="mb-4">For legal inquiries or support, please contact:</p>
              <a 
                href="mailto:leaflearningofficial@gmail.com" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="font-medium">leaflearningofficial@gmail.com</span>
              </a>
            </div>
          </div>
        </section>

        {/* Back to Signup */}
        <div className="text-center">
          <Link 
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A7C59] hover:bg-[#3d6649] text-white font-medium rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign Up
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} LeafLearning. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
