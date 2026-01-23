'use client';

import { motion } from 'framer-motion';
import {
    ArrowRight,
    Search,
    Cpu,
    FileText,
    Key,
    Sparkles,
    Bot,
    Gauge,
    Zap,
    CheckCircle,
    Code,
} from 'lucide-react';

// Deep Research Section - New Vertical Timeline Design
export const DeepResearchSection = () => {
    return (
        <section id="deep-research" className="relative py-24 lg:py-32 overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 text-center px-6 mb-16"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm mb-6 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-300 tracking-wide uppercase">v4: Custom Schemas + Extraction</span>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white">
                    How <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Deep Research</span> Works
                </h2>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Multi-stage AI pipeline optimized for speed and accuracy.{' '}
                    <span className="text-white font-medium">Web search</span> →{' '}
                    <span className="text-white font-medium">AI analysis</span> →{' '}
                    <span className="text-white font-medium">Structured JSON output</span>.
                </p>
            </motion.div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

                    {/* Left Column - The Engine Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-5 lg:sticky lg:top-32 self-start space-y-8"
                    >
                        <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500" />

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">~30-40 seconds</div>
                            </div>

                            <h3 className="font-mono text-sm text-gray-500 mb-2 uppercase tracking-wider">The Engine</h3>
                            <h2 className="text-2xl font-bold mb-4 text-white">Deep Research Pipeline</h2>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                Unlike traditional RAG, our pipeline performs iterative reasoning steps. It doesn&apos;t just retrieve; it understands, filters, and synthesizes information from over a dozen sources in parallel before rendering the final JSON.
                            </p>

                            <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 text-sm font-mono text-purple-400">
                                &gt; Initiating sequence...<br />
                                &gt; Allocating worker nodes...<br />
                                &gt; Ready for input.
                            </div>
                        </div>

                        {/* Built for Developers Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Code className="w-4 h-4 text-purple-400" />
                                    Built for developers
                                </h4>
                                <p className="text-sm text-gray-400">
                                    Not for end users. Custom schemas. Extraction mode. Webhook delivery. <span className="text-white font-medium">JSON, not Markdown.</span>
                                </p>
                            </div>
                        </div>

                        {/* Agentic Loop Card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-r from-fuchsia-900/20 to-purple-900/20 border border-fuchsia-500/30 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                                    <h4 className="text-lg font-semibold text-white">Agentic Reasoning Loop</h4>
                                    <span className="text-[10px] font-bold uppercase text-fuchsia-400 bg-fuchsia-500/20 px-2 py-0.5 rounded border border-fuchsia-500/30">Optional</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-3">
                                    Enable <code className="px-1.5 py-0.5 bg-white/5 rounded text-fuchsia-400 text-xs">agentic_loop: true</code> for iterative fact-checking that eliminates outdated data and hallucinations.
                                </p>
                                <p className="text-xs text-gray-500">
                                    The AI evaluates search results, detects date mismatches, and refines queries up to 3 times to ensure accuracy.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column - Pipeline Timeline */}
                    <div className="lg:col-span-7 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-8 lg:left-12 top-8 bottom-8 w-0.5 bg-gradient-to-b from-transparent via-zinc-700 to-transparent hidden md:block opacity-50" />

                        <div className="space-y-6">
                            {/* Step 1: Search */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="relative flex items-center group"
                            >
                                <div className="hidden md:flex absolute left-8 lg:left-12 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-900 border-2 border-blue-500 z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                <div className="w-full ml-0 md:ml-16 lg:ml-20 bg-[#111111]/80 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)] transition-all duration-300">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                            <Search className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-lg font-bold text-white">1. Search</h3>
                                                <span className="text-xs font-mono text-gray-500 bg-zinc-800 px-2 py-0.5 rounded">T-0s</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Fetches 12+ authoritative web sources concurrently.</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">Tavily API</span>
                                                <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">Raw Content</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 self-center hidden sm:block" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Step 1.5: Agentic Verify (Optional) */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15 }}
                                className="relative flex items-center group"
                            >
                                <div className="hidden md:flex absolute left-8 lg:left-12 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-900 border-2 border-fuchsia-500 z-10 shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
                                <div className="w-full ml-0 md:ml-16 lg:ml-20 bg-gradient-to-r from-fuchsia-500/5 to-[#111111]/80 backdrop-blur-md border border-fuchsia-500/30 p-6 rounded-2xl hover:border-fuchsia-500/50 hover:shadow-[0_0_30px_-10px_rgba(217,70,239,0.2)] transition-all duration-300">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 group-hover:scale-110 transition-transform duration-300">
                                            <Sparkles className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-white">1.5 Verify</h3>
                                                    <span className="text-[10px] font-bold uppercase text-fuchsia-400 bg-fuchsia-500/20 px-1.5 py-0.5 rounded">AGENTIC</span>
                                                </div>
                                                <span className="text-xs font-mono text-gray-500 bg-zinc-800 px-2 py-0.5 rounded">Optional</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Iterative fact-checking. Detects outdated data, refines queries up to 3x.</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase font-bold text-fuchsia-400 bg-fuchsia-400/10 px-2 py-1 rounded border border-fuchsia-400/20">Date Validation</span>
                                                <span className="text-[10px] uppercase font-bold text-fuchsia-400 bg-fuchsia-400/10 px-2 py-1 rounded border border-fuchsia-400/20">Query Refinement</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 self-center hidden sm:block" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Step 2: Reason */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="relative flex items-center group"
                            >
                                <div className="hidden md:flex absolute left-8 lg:left-12 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-900 border-2 border-purple-500 z-10 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                <div className="w-full ml-0 md:ml-16 lg:ml-20 bg-[#111111]/80 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl hover:border-purple-500/50 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)] transition-all duration-300">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                                            <Cpu className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-lg font-bold text-white">2. Reason</h3>
                                                <span className="text-xs font-mono text-gray-500 bg-zinc-800 px-2 py-0.5 rounded">T+12s</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">AI extracts key insights, filtering noise and hallucination.</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">LLM Reasoning</span>
                                                <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">Fact Extraction</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 self-center hidden sm:block" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Step 3: Render */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                className="relative flex items-center group"
                            >
                                <div className="hidden md:flex absolute left-8 lg:left-12 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-900 border-2 border-orange-500 z-10 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                <div className="w-full ml-0 md:ml-16 lg:ml-20 bg-[#111111]/80 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl hover:border-orange-500/50 hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.2)] transition-all duration-300">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-lg font-bold text-white">3. Render</h3>
                                                <span className="text-xs font-mono text-gray-500 bg-zinc-800 px-2 py-0.5 rounded">T+28s</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Lightning-fast report writing and synthesis.</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">Stream Processing</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 self-center hidden sm:block" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Step 4: Report */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                                className="relative flex items-center group"
                            >
                                <div className="hidden md:flex absolute left-8 lg:left-12 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-900 border-2 border-green-500 z-10 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <div className="w-full ml-0 md:ml-16 lg:ml-20 bg-[#111111]/80 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl hover:border-green-500/50 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)] transition-all duration-300">
                                    <div className="flex items-start gap-5">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
                                            <FileText className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-lg font-bold text-white">4. Report</h3>
                                                <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Done</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Structured JSON output complete with citations.</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] uppercase font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">JSON</span>
                                                <span className="text-[10px] uppercase font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">Citations</span>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-green-500 self-center hidden sm:block" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="group p-6 rounded-2xl bg-[#111111] border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500 transition-colors">
                            <Gauge className="w-6 h-6 text-cyan-400 group-hover:text-black transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Lightning Fast Research</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Get comprehensive research reports in 30-40 seconds. Optimized pipeline delivers speed without sacrificing depth.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="group p-6 rounded-2xl bg-[#111111] border border-zinc-800 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                            <Bot className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Built for Machines</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Deterministic JSON output with typed fields. No parsing Markdown. Slots directly into your agent pipeline.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="group p-6 rounded-2xl bg-[#111111] border border-zinc-800 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:bg-yellow-500 transition-colors">
                            <Key className="w-6 h-6 text-yellow-500 group-hover:text-black transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-500 transition-colors">BYOK = No Limits</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Bring your own Gemini, Groq, and Tavily keys. No rate limits from us. Scale with your own quotas.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
