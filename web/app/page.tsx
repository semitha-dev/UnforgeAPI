import type { Metadata } from 'next';
import StickyNavigation from './(landing)/components/StickyNavigation';
import HeroSection from './(landing)/components/HeroSection';
import ProblemSection from './(landing)/components/ProblemSection';
import SolutionSection from './(landing)/components/SolutionSection';
import FeaturesSection from './(landing)/components/FeaturesSection';
import PricingSection from './(landing)/components/PricingSection';
import FAQSection from './(landing)/components/FAQSection';
import FinalCTASection from './(landing)/components/FinalCTASection';
import FooterSection from './(landing)/components/FooterSection';

export const metadata: Metadata = {
  title: 'LeafLearning - Study Smarter with AI | Learn 10X Faster',
  description: 'Transform how you study with AI-powered document summarization, automatic flashcard generation, and adaptive study planning. Join 1K+ students learning faster and achieving better grades with LeafLearning.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background landing-page">
      <StickyNavigation />
      
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
    </main>
  );
}