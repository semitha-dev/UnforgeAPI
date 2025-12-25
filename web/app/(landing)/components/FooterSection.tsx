'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, BadgeCheck, Share2, Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';

const FooterSection = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentYear, setCurrentYear] = useState(2025);

  useEffect(() => {
    setIsHydrated(true);
    setCurrentYear(new Date().getFullYear());
  }, []);

  const footerLinks = {
    product: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Demo', href: '/#demo' },
      { label: 'FAQ', href: '/#faq' }
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' }
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Student Discount', href: '/#pricing' },
      { label: 'Feedback', href: '/support' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Refund Policy', href: '/terms#refund' }
    ]
  };

  const socialLinks = [
    { icon: 'twitter', href: '#', label: 'Twitter' },
    { icon: 'facebook', href: '#', label: 'Facebook' },
    { icon: 'instagram', href: '#', label: 'Instagram' },
    { icon: 'linkedin', href: '#', label: 'LinkedIn' }
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-accent-foreground"
                >
                  <path
                    d="M12 2L4 7V12C4 16.97 7.84 21.5 12 22C16.16 21.5 20 16.97 20 12V7L12 2Z"
                    fill="currentColor"
                    opacity="0.2"
                  />
                  <path
                    d="M12 2L4 7V12C4 16.97 7.84 21.5 12 22C16.16 21.5 20 16.97 20 12V7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold font-headline">LeafLearning</span>
            </Link>
            <p className="text-sm text-primary-foreground/80 font-body mb-4">
              AI-powered study companion helping students learn 10X faster.
            </p>
            <div className="flex items-center space-x-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-8 h-8 bg-primary-foreground/10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors duration-250"
                >
                  <Share2 size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold font-headline mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors duration-250"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold font-headline mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors duration-250"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold font-headline mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors duration-250"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold font-headline mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-accent font-body transition-colors duration-250"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-primary-foreground/80 font-body">
              © {isHydrated ? currentYear : 2025} LeafLearning. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              {[
                { icon: ShieldCheck, text: 'FERPA Compliant' },
                { icon: Lock, text: 'AES-256 Encrypted' },
                { icon: BadgeCheck, text: 'SOC 2 Certified' }
              ].map((badge, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <badge.icon size={16} className="text-accent" />
                  <span className="text-xs text-primary-foreground/80 font-body">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;