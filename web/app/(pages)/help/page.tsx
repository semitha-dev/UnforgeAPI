'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Leaf, HelpCircle, Search, Book, CreditCard, Settings, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react'

const helpCategories = [
  {
    icon: Book,
    title: 'Getting Started',
    description: 'Learn the basics of LeafLearning',
    articles: [
      { title: 'How to create your first project', answer: 'Simply click "New Project" from your dashboard, upload your study material (PDF, notes, or paste text), and our AI will help you generate flashcards, quizzes, and summaries automatically.' },
      { title: 'Uploading study materials', answer: 'You can upload PDFs, images, or paste text directly. We support files up to 10MB. For best results, ensure your PDFs have selectable text rather than scanned images.' },
      { title: 'Understanding AI tokens', answer: 'AI tokens are used to power our AI features. Each token represents approximately one word of processing. You get free tokens monthly, and can purchase more if needed.' },
      { title: 'Creating flashcards from notes', answer: 'After uploading your notes, select the text you want to convert, then click "Generate Flashcards". Our AI will create question-answer pairs automatically.' },
    ]
  },
  {
    icon: CreditCard,
    title: 'Billing & Subscription',
    description: 'Payment and pricing questions',
    articles: [
      { title: 'How does billing work?', answer: 'We offer monthly and yearly subscription plans. Your subscription auto-renews unless cancelled. You can manage your subscription from your account settings.' },
      { title: 'Can I cancel anytime?', answer: 'Yes! You can cancel your subscription anytime. You will retain access to premium features until the end of your billing period.' },
      { title: 'How to purchase more tokens', answer: 'Go to your dashboard, click on your token balance, and select a token pack. We accept all major credit cards and process payments securely through Stripe.' },
      { title: 'Refund policy', answer: 'We offer a 7-day money-back guarantee for new subscribers. Contact support within 7 days of your first payment for a full refund.' },
    ]
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Manage your account and preferences',
    articles: [
      { title: 'How to change my email', answer: 'Go to Dashboard > Settings > Account. You can update your email address there. You will need to verify your new email before the change takes effect.' },
      { title: 'Resetting your password', answer: 'Click "Forgot Password" on the login page, or go to Settings > Security to change your password while logged in.' },
      { title: 'Deleting your account', answer: 'You can request account deletion from Settings > Account > Delete Account. This action is permanent and cannot be undone.' },
      { title: 'Managing notifications', answer: 'Go to Settings > Notifications to customize which emails you receive, including study reminders and product updates.' },
    ]
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    description: 'Keep your data safe',
    articles: [
      { title: 'How is my data protected?', answer: 'We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Your study materials are never shared with third parties.' },
      { title: 'Where is my data stored?', answer: 'Your data is stored in secure cloud servers with redundant backups. We use Supabase for database services with enterprise-grade security.' },
      { title: 'Can I export my data?', answer: 'Yes! You can export your flashcards and quizzes anytime from your project settings. We support export to CSV and PDF formats.' },
      { title: 'Two-factor authentication', answer: 'We support 2FA through authenticator apps. Enable it from Settings > Security > Two-Factor Authentication.' },
    ]
  },
  {
    icon: Zap,
    title: 'Features & Tips',
    description: 'Get the most out of LeafLearning',
    articles: [
      { title: 'Best practices for studying', answer: 'Use spaced repetition! Our system automatically schedules flashcard reviews at optimal intervals. Study for 25-minute sessions with 5-minute breaks.' },
      { title: 'Sharing flashcards with others', answer: 'Click the share button on any flashcard set to generate a share link. Recipients can view and study your flashcards without needing an account.' },
      { title: 'Using the quiz feature', answer: 'Generate quizzes from your notes to test your knowledge. Choose between multiple choice, true/false, or mixed formats. Track your progress over time.' },
      { title: 'AI summary feature', answer: 'Our AI can summarize long documents into key points. Great for quick revision before exams!' },
    ]
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    articles: category.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0 || searchQuery === '')

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
            <HelpCircle className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold font-cta text-accent">Help Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6">
            How Can We Help You?
          </h1>
          <p className="text-xl text-text-secondary font-body max-w-3xl mx-auto mb-8">
            Find answers to common questions and learn how to get the most out of LeafLearning.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card text-text-primary font-body focus:outline-none focus:border-accent transition-colors shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary font-body text-lg mb-4">No results found for "{searchQuery}"</p>
              <Link href="/contact" className="text-accent hover:underline font-medium">Contact support instead</Link>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((category) => (
                <div key={category.title} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="p-6 bg-muted/30 border-b border-border flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                      <category.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-headline text-primary">{category.title}</h2>
                      <p className="text-sm text-text-secondary font-body">{category.description}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {category.articles.map((article) => (
                      <div key={article.title} className="p-4">
                        <button 
                          onClick={() => setExpandedArticle(expandedArticle === article.title ? null : article.title)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-text-primary font-body">{article.title}</span>
                          {expandedArticle === article.title ? (
                            <ChevronUp className="w-5 h-5 text-text-secondary flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-secondary flex-shrink-0" />
                          )}
                        </button>
                        {expandedArticle === article.title && (
                          <p className="mt-3 text-text-secondary font-body text-sm leading-relaxed pl-0 pr-8">
                            {article.answer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold font-headline text-primary mb-4">Still Need Help?</h2>
          <p className="text-text-secondary font-body mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold font-cta hover:bg-accent/90 transition-colors"
            >
              Contact Support
            </Link>
            <Link 
              href="/support"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold font-cta hover:bg-primary/90 transition-colors"
            >
              Submit Feedback
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
