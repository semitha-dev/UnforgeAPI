'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, MessageSquare, MapPin, Clock, Send } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
            </div>
            <span className="font-bold text-white">UnforgeAPI</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-900/20 via-[#0a0a0a] to-purple-900/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Contact Us</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            We&apos;d Love to Hear From You
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have a question, feedback, or just want to say hi? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[#111111] rounded-2xl p-8 border border-white/10 text-center hover:border-white/20 transition-colors">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Email Us</h3>
              <p className="text-sm text-gray-400 mb-4">For general inquiries and support</p>
              <a href="mailto:support@unforgeapi.com" className="text-emerald-400 font-medium hover:underline">
                support@unforgeapi.com
              </a>
            </div>
            <div className="bg-[#111111] rounded-2xl p-8 border border-white/10 text-center hover:border-white/20 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Response Time</h3>
              <p className="text-sm text-gray-400 mb-4">We typically respond within</p>
              <span className="text-blue-400 font-bold">24-48 hours</span>
            </div>
            <div className="bg-[#111111] rounded-2xl p-8 border border-white/10 text-center hover:border-white/20 transition-colors">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Location</h3>
              <p className="text-sm text-gray-400 mb-4">We&apos;re a fully remote team</p>
              <span className="text-purple-400 font-bold">Worldwide 🌍</span>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#111111] rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Send Us a Message</h2>
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const name = (form.elements.namedItem('name') as HTMLInputElement).value
                const email = (form.elements.namedItem('email') as HTMLInputElement).value
                const subject = (form.elements.namedItem('subject') as HTMLSelectElement).value
                const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value

                const mailtoSubject = encodeURIComponent(`[${subject}] Contact from ${name}`)
                const mailtoBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`)

                window.location.href = `mailto:support@unforgeapi.com?subject=${mailtoSubject}&body=${mailtoBody}`
              }}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                    <input
                      name="name"
                      type="text"
                      placeholder="Your name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0a0a0a] text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0a0a0a] text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                  <select name="subject" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0a0a0a] text-white focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing Question">Billing Question</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="How can we help you?"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0a0a0a] text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors"
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
      <section className="py-16 bg-white/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Looking for Quick Answers?</h2>
          <p className="text-gray-400 mb-6">
            Check out our FAQ section for commonly asked questions.
          </p>
          <Link
            href="/#faq"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            View FAQ
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} UnforgeAPI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
