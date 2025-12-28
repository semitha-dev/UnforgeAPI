'use client';

import { useState } from 'react';
import { HelpCircle, ChevronUp, ChevronDown, MessageSquare, Mail, BookOpen, Brain } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: 'atlas' | 'general' | 'technical' | 'pricing';
}

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQ[] = [
    {
      question: 'Is this just ChatGPT with a different interface?',
      answer: 'No. ChatGPT is a general chatbot—it waits for you to ask questions. LeafLearning is a proactive study coach. Atlas Intelligence™ runs 4 specialized algorithms in the background: Content Gap Audit (scans your notes against syllabi), Knowledge Heatmap (finds concepts you haven\'t tested yourself on), Biological Rhythm (optimizes when you study), and Forgetting Curve (predicts memory decay). It tells you what you\'re missing before you even ask.',
      category: 'atlas'
    },
    {
      question: 'What is a Content Gap Audit?',
      answer: 'When you upload notes or documents, Atlas scans them against university-level standards and common syllabus structures. It flags topics you\'ve missed entirely—for example: "You covered Photosynthesis but missed the Calvin Cycle." This prevents the silent gaps that cause exam surprises.',
      category: 'atlas'
    },
    {
      question: 'How does the Forgetting Curve work?',
      answer: 'Based on Ebbinghaus\'s research, Atlas tracks when you learned each concept and predicts when your memory will decay below usable retention (~40%). The "Decay Meter" visualizes this in real-time. When a topic hits the danger zone, you get a notification: "Your retention on Anatomy has dropped to 40%. Review now."',
      category: 'atlas'
    },
    {
      question: 'What is my "Biological Rhythm" and how do you find it?',
      answer: 'Atlas analyzes your flashcard accuracy by hour of the day. After a few study sessions, it identifies your "Golden Window"—typically a 3-hour block where your brain performs 2x better than average. Morning Reports then schedule your hardest material during these peak hours.',
      category: 'atlas'
    },
    {
      question: 'What happens if I run out of tokens?',
      answer: 'You can purchase additional token packs anytime at transparent pricing. There are no subscriptions or recurring charges. Unused tokens never expire. You start with 500 free tokens—enough for about 3 full chapter audits or 10 flashcard sets.',
      category: 'pricing'
    },
    {
      question: 'Can I share flashcards and quizzes with friends?',
      answer: 'Absolutely! Generate a unique shareable link for any flashcard set or quiz. Friends can study immediately—no account required. It\'s completely free to share.',
      category: 'general'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support PDF, Word (.docx), PowerPoint (.pptx), plain text (.txt), and images with text (OCR). Maximum file size is 50MB per document. You can also write notes directly in the app.',
      category: 'technical'
    },
    {
      question: 'Is LeafLearning available on mobile?',
      answer: 'Yes! LeafLearning is fully optimized for mobile browsers. All features including document upload, flashcard review, Morning Reports, and Atlas insights work seamlessly on smartphones and tablets.',
      category: 'technical'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
            <HelpCircle size={20} className="text-secondary" />
            <span className="text-sm font-semibold font-cta text-secondary">Common Questions</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-text-secondary font-body">
            Everything you need to know about Atlas Intelligence™
          </p>
        </div>

        {/* Atlas Highlight Box */}
        <div className="bg-accent/5 rounded-2xl p-6 border border-accent/20 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain size={24} className="text-accent" />
            </div>
            <div>
              <h3 className="font-bold font-headline text-primary mb-2">About Atlas Intelligence™</h3>
              <p className="text-sm text-text-secondary font-body">
                Atlas is not just AI—it's a metacognitive system that audits your knowledge in the background. 
                The first few questions explain how each algorithm works.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-card rounded-xl border shadow-sm overflow-hidden transition-all duration-250 hover:shadow-md ${
                faq.category === 'atlas' ? 'border-accent/30' : 'border-border'
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center space-x-3 pr-4">
                  {faq.category === 'atlas' && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-bold font-cta rounded-full">
                      ATLAS
                    </span>
                  )}
                  <span className="text-lg font-semibold font-headline text-primary">
                    {faq.question}
                  </span>
                </div>
                {openIndex === index ? (
                  <ChevronUp size={24} className="text-accent flex-shrink-0" />
                ) : (
                  <ChevronDown size={24} className="text-text-secondary flex-shrink-0" />
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

        {/* Contact Support CTA */}
        <div className="mt-12 bg-card rounded-2xl p-8 border border-border text-center">
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
              className="inline-flex items-center space-x-2 px-6 py-3 bg-secondary text-secondary-foreground font-bold font-cta rounded-xl transition-all duration-250 hover:bg-secondary/90 hover:shadow-md"
            >
              <Mail size={20} />
              <span>Email Support</span>
            </a>
            <a
              href="/help"
              className="inline-flex items-center space-x-2 px-6 py-3 border-2 border-secondary text-secondary font-bold font-cta rounded-xl transition-all duration-250 hover:bg-secondary/10"
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