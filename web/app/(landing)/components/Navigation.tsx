'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  /** Hide section links when on non-landing pages */
  showSectionLinks?: boolean;
}

export const Navigation = ({ showSectionLinks = true }: NavigationProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg">
              <Image
                src="/reallogo.png"
                alt="UnforgeAPI Logo"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">UnforgeAPI</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            {showSectionLinks ? (
              <>
                <a href="#deep-research" onClick={(e) => scrollToSection(e, 'deep-research')} className="hover:text-white transition-colors cursor-pointer">How It Works</a>
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition-colors cursor-pointer">Features</a>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-white transition-colors cursor-pointer">Router</a>
                <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition-colors cursor-pointer">Pricing</a>
              </>
            ) : (
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
            )}
            <Link href="/playground" className="hover:text-white transition-colors">Playground</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/signin" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-white hover:bg-gray-100 text-black text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              Get Started Free
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#050505]/95 border-t border-white/10"
          >
            <div className="px-6 py-4 space-y-4">
              {showSectionLinks ? (
                <>
                  <a href="#deep-research" onClick={(e) => scrollToSection(e, 'deep-research')} className="block text-gray-400 hover:text-white cursor-pointer">How It Works</a>
                  <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="block text-gray-400 hover:text-white cursor-pointer">Features</a>
                  <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="block text-gray-400 hover:text-white cursor-pointer">Router</a>
                  <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="block text-gray-400 hover:text-white cursor-pointer">Pricing</a>
                </>
              ) : (
                <Link href="/" className="block text-gray-400 hover:text-white">Home</Link>
              )}
              <Link href="/playground" className="block text-gray-400 hover:text-white">Playground</Link>
              <Link href="/docs" className="block text-gray-400 hover:text-white">Docs</Link>
              <Link href="/blog" className="block text-gray-400 hover:text-white">Blog</Link>
              <Link href="/signin" className="block text-gray-400 hover:text-white">Sign In</Link>
              <Link href="/signup" className="block py-2 text-center bg-white text-black rounded-lg font-bold">
                Get Started Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
