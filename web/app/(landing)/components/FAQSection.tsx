'use client';

import { useState } from 'react';
import { HelpCircle, ChevronUp, ChevronDown, MessageSquare, Mail, BookOpen } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'pricing';
}

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQ[] = [
    {
      question: 'How accurate is the AI summarization?',
      answer: 'Our AI achieves 98.5% accuracy in extracting key concepts and maintaining context. We use advanced natural language processing trained on millions of academic documents. All summaries preserve citations and can be verified against source material. Students report 95%+ satisfaction with summary quality.',
      category: 'technical'
    },
    {
      question: 'What happens if I run out of tokens?',
      answer: 'You can purchase additional token packs anytime at transparent pricing. There are no subscriptions or recurring charges. Unused tokens never expire and roll over indefinitely. We also offer a free tier with 100 tokens when you sign up.',
      category: 'pricing'
    },
    {
      question: 'Can I use LeafLearning on mobile devices?',
      answer: 'Yes! LeafLearning is fully optimized for mobile browsers. All features work seamlessly on smartphones and tablets, including document upload, flashcard review, and progress tracking.',
      category: 'technical'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support PDF, Word (.docx), PowerPoint (.pptx), plain text (.txt), and images with text (OCR). Maximum file size is 50MB per document. Scanned documents are automatically processed with optical character recognition for text extraction.',
      category: 'technical'
    },
    {
      question: 'Can I share flashcards and quizzes with friends?',
      answer: 'Absolutely! You can generate a unique shareable link for any flashcard set or quiz you create. Just copy the link and send it to your friends. When they click the link, they can immediately start studying with your flashcards or take your quiz - no account required. After completing, they will see an option to create their own study materials on LeafLearning.',
      category: 'general'
    },
    {
      question: 'What is the refund policy?',
      answer: 'We offer a 30-day satisfaction guarantee. If you are not completely satisfied with LeafLearning, contact support for a full refund of unused tokens. No questions asked. Free tier users can upgrade risk-free.',
      category: 'pricing'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
            <HelpCircle size={20} className="text-secondary fill-secondary" />
            <span className="text-sm font-semibold font-cta text-secondary">Common Questions</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-text-secondary font-body">
            Everything you need to know about LeafLearning
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-card rounded-lg border border-border shadow-sm overflow-hidden transition-all duration-250 hover:shadow-card"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <span className="text-lg font-semibold font-headline text-primary pr-4">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp size={24} className="text-accent flex-shrink-0" />
                ) : (
                  <ChevronDown size={24} className="text-accent flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-text-secondary font-body leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-card rounded-lg p-8 border border-border text-center">
          <MessageSquare size={48} className="text-accent mx-auto mb-4" />
          <h3 className="text-2xl font-bold font-headline text-primary mb-2">
            Still Have Questions?
          </h3>
          <p className="text-text-secondary font-body mb-6">
            Our support team is here to help you succeed
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@leaflearning.com"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-secondary text-secondary-foreground font-bold font-cta rounded-lg transition-all duration-250 hover:bg-secondary/90 hover:shadow-card"
            >
              <Mail size={20} />
              <span>Email Support</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-secondary text-secondary font-bold font-cta rounded-lg transition-all duration-250 hover:bg-secondary/10"
            >
              <BookOpen size={20} />
              <span>Help Center</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;