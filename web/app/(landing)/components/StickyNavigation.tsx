'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const StickyNavigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Pricing', href: '#pricing', id: 'pricing' },
    { label: 'FAQ', href: '#faq', id: 'faq' },
    { label: 'Blog', href: '/blog', id: 'blog', isExternal: true }
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors overflow-hidden ${
              isScrolled ? 'bg-emerald-500' : 'bg-emerald-500/90'
            }`}>
              <Image src="/new_logo.png" alt="UnforgeAPI" width={24} height={24} className="object-contain" />
            </div>
            <span className={`font-bold text-lg transition-colors ${
              isScrolled ? 'text-gray-900' : 'text-gray-900'
            }`}>
              UnforgeAPI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.isExternal ? (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                    isScrolled ? 'text-gray-600' : 'text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.id)}
                  className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                    isScrolled ? 'text-gray-600' : 'text-gray-700'
                  }`}
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/signin"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isScrolled
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-200/50 transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-white border-t border-gray-100 shadow-lg"
        >
          <nav className="flex flex-col p-4 space-y-2">
            {navLinks.map((link) => (
              link.isExternal ? (
                <Link
                  key={link.id}
                  href={link.href}
                  className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.id)}
                  className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}
            <hr className="my-2" />
            <Link
              href="/signin"
              className="px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-3 bg-emerald-500 text-white text-center font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Get Started Free
            </Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
};

export default StickyNavigation;
