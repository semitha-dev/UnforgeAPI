'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'

interface AuthLayoutProps {
    children: React.ReactNode
    /** Title shown on the left branding panel (mobile only shows logo) */
    brandTitle?: string
    /** Main headline for the left panel */
    headline?: React.ReactNode
    /** Subtitle/description for the left panel */
    subtitle?: string
    /** Feature list items to display */
    features?: string[]
    /** Whether to show step progress indicator */
    showSteps?: boolean
    /** Current step (1-based) */
    currentStep?: number
    /** Step labels */
    stepLabels?: string[]
    /** Optional footer link - defaults to docs */
    footerLink?: {
        href: string
        label: string
    }
}

export default function AuthLayout({
    children,
    brandTitle = 'UnforgeAPI',
    headline = (
        <>
            Build faster, <br />
            <span className="text-[#00A86B]">Scale smarter.</span>
        </>
    ),
    subtitle = 'Join thousands of developers building the next generation of software on UnforgeAPI. Set up your workspace in seconds.',
    features = [
        'Instant API generation',
        'Secure by default',
        'Real-time collaboration',
    ],
    showSteps = false,
    currentStep = 1,
    stepLabels = ['Account', 'Workspace', 'Finish'],
    footerLink = {
        href: '/help',
        label: 'Need help? Visit our support center'
    }
}: AuthLayoutProps) {
    return (
        <div className="bg-[#F9FAFB] dark:bg-[#111827] font-sans h-screen w-full overflow-hidden flex flex-col md:flex-row text-slate-900 dark:text-white transition-colors duration-200">
            {/* Left Branding Panel - Hidden on mobile */}
            <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-[#0F172A] dark:bg-black relative flex-col p-12 text-white overflow-hidden">
                {/* Grid Pattern Background */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <pattern height="10" id="auth-grid" patternUnits="userSpaceOnUse" width="10">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect fill="url(#auth-grid)" height="100" width="100" />
                    </svg>
                </div>

                {/* Logo */}
                <div className="absolute top-12 left-12 z-10 flex items-center space-x-3">
                    <div className="bg-[#00A86B]/20 p-2.5 rounded-lg backdrop-blur-sm border border-[#00A86B]/30">
                        <Image src="/reallogo.png" alt={brandTitle} width={28} height={28} className="object-contain" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">{brandTitle}</span>
                </div>

                {/* Main Content - Centered vertically */}
                <div className="relative z-10 max-w-lg flex-1 flex flex-col justify-center ml-4 lg:ml-8">
                    <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        {headline}
                    </h1>
                    <p className="text-slate-400 text-xl mb-8 font-light leading-relaxed">
                        {subtitle}
                    </p>
                    <ul className="space-y-4">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-3 text-slate-300 text-lg">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-[#00A86B]" />
                                </span>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer */}
                <div className="absolute bottom-12 left-12 z-10 text-sm text-slate-500 font-mono">
                    © {new Date().getFullYear()} UnforgeAPI Inc.
                </div>
            </div>

            {/* Right Content Panel */}
            <div className="w-full md:w-7/12 lg:w-1/2 bg-white flex flex-col h-full overflow-y-auto">
                {/* Step Progress Indicator */}
                {showSteps && (
                    <div className="w-full px-6 sm:px-8 py-5 flex justify-center md:justify-end items-center border-b border-slate-200">
                        <div className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium">
                            {stepLabels.map((label, index) => {
                                const stepNum = index + 1
                                const isCompleted = stepNum < currentStep
                                const isCurrent = stepNum === currentStep
                                const isFuture = stepNum > currentStep

                                return (
                                    <span key={index} className="flex items-center">
                                        <span className={`flex items-center ${isCompleted ? 'text-[#00A86B]' :
                                            isCurrent ? 'text-slate-900' :
                                                'text-slate-400'
                                            }`}>
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-1.5 sm:mr-2 text-xs font-semibold transition-all duration-200 ${isCompleted ? 'bg-[#00A86B] text-white' :
                                                isCurrent ? 'bg-slate-100 text-slate-600 ring-2 ring-[#00A86B] ring-offset-2 ring-offset-white' :
                                                    'bg-slate-100 text-slate-400 border border-slate-200'
                                                }`}>
                                                {isCompleted ? (
                                                    <Check className="w-3.5 h-3.5" />
                                                ) : (
                                                    stepNum
                                                )}
                                            </span>
                                            <span className="hidden sm:inline">{label}</span>
                                        </span>
                                        {index < stepLabels.length - 1 && (
                                            <svg className="w-4 h-4 mx-1 sm:mx-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        )}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Main Form Content */}
                <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 w-full py-8 sm:py-12">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo - Only visible on mobile */}
                        <div className="w-12 h-12 bg-[#00A86B]/10 rounded-xl flex items-center justify-center mb-6 md:hidden">
                            <Image src="/reallogo.png" alt={brandTitle} width={24} height={24} className="object-contain" />
                        </div>

                        {children}
                    </div>
                </div>
                <div className="p-6 sm:p-8 border-t border-slate-100 text-center">
                    <Link
                        href={footerLink.href}
                        className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#00A86B] transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {footerLink.label}
                    </Link>
                </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => document.documentElement.classList.toggle('dark')}
                    className="p-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-lg"
                    aria-label="Toggle dark mode"
                >
                    <svg className="w-5 h-5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <svg className="w-5 h-5 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
