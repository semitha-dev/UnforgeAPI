'use client';

import { motion } from 'framer-motion';
import {
    Search,
    ShieldCheck,
    Zap,
    Sparkles,
    ArrowRight,
    Check
} from 'lucide-react';
import Link from 'next/link';

// Deep Research Section - New V4 Design
export const DeepResearchSection = () => {
    return (
        <section className="relative py-24 min-h-screen overflow-hidden bg-[#080808] text-gray-200">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
            {/* Background Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-red-900/10 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center">
                {/* Header */}
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-8"
                    >
                        <Sparkles className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">V4 Pipeline Engine</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-white"
                    >
                        How <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-amber-500">Deep Research</span> <br />Works
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed"
                    >
                        A simplified multi-stage AI pipeline. From raw web search to structured data synthesis in three powerful steps.
                    </motion.p>
                </div>

                {/* Steps Container */}
                <div className="w-full relative py-12">
                    {/* SVG Connector Path */}
                    <div className="absolute inset-0 top-20 pointer-events-none hidden md:block">
                        <svg className="w-full h-48" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 200">
                            <path
                                d="M100,100 C250,50 400,150 500,150 C600,150 750,50 900,100"
                                strokeWidth="2"
                                className="stroke-gray-800"
                                style={{ strokeDasharray: '8, 8' }}
                            />
                        </svg>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Step 1: Search */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center text-center group relative z-10"
                        >
                            <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                                <div className="relative w-40 h-28 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col p-3 transition-transform duration-300 group-hover:-translate-y-2 shadow-2xl">
                                    <div className="flex gap-2 mb-2">
                                        <div className="h-1.5 w-12 bg-zinc-700 rounded-full" />
                                        <div className="h-1.5 w-8 bg-zinc-800 rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-1 w-full bg-zinc-800 rounded-full" />
                                        <div className="h-1 w-full bg-zinc-800 rounded-full" />
                                        <div className="h-1 w-2/3 bg-zinc-800 rounded-full" />
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 bg-red-500 text-white p-2 rounded-lg shadow-lg border border-red-400">
                                        <Search className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-4">1. Search</h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                Concurrent fetching of authoritative web sources, gathering raw content across trusted domains instantly.
                            </p>
                        </motion.div>

                        {/* Step 2: Verify & Check */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col items-center text-center group relative z-10"
                        >
                            <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                                <div className="flex items-end gap-3 transition-transform duration-300 group-hover:scale-105">
                                    <div className="w-6 h-12 bg-red-500 rounded-t-md opacity-80" />
                                    <div className="w-6 h-8 bg-zinc-800 rounded-t-md" />
                                    <div className="w-6 h-16 bg-red-500 rounded-t-md" />
                                    <div className="w-6 h-10 bg-red-500 rounded-t-md opacity-60" />
                                </div>
                                <div className="absolute top-8 right-16 md:right-10 bg-white text-red-500 p-1.5 rounded-full shadow-lg z-20">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-4">2. Verify & Check</h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                Iterative fact-checking agent detects outdated data and filters noise to refine search queries for precision.
                            </p>
                        </motion.div>

                        {/* Step 3: Reason & Render */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col items-center text-center group relative z-10"
                        >
                            <div className="h-48 w-full flex items-center justify-center mb-8 relative">
                                <div className="relative w-36 h-44 bg-red-500 rounded-2xl shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-white transition-transform duration-300 group-hover:rotate-3">
                                    <div className="absolute top-4 right-4 text-white/50 text-[10px]">JSON</div>
                                    <Zap className="w-10 h-10 mb-2" />
                                    <div className="text-xl font-bold">Done</div>
                                    <div className="absolute -left-6 top-1/2 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-xs text-white shadow-xl flex items-center gap-1">
                                        <Check className="w-3 h-3 text-green-500" />
                                        Verified
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-4">3. Reason & Render</h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                Structuring data into a readable format immediately with citations and source links ready for ingestion.
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-20">
                    <Link href="/docs">
                        <button className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-medium text-white transition-all duration-300 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-red-900/50 hover:text-red-400 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                            <span>Learn More about the API</span>
                            <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
};
