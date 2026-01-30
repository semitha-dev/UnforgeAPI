'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    Activity,
    AlertTriangle,
    Check,
    CheckCircle,
    Database,
    FileX,
    Key,
    BookOpen,
    Network
} from 'lucide-react';
import Link from 'next/link';

// Register GSAP ScrollTrigger
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const KnowledgeLayerSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const leftCardsRef = useRef<HTMLDivElement>(null);
    const rightCardsRef = useRef<HTMLDivElement>(null);
    const centerHubRef = useRef<HTMLDivElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 60%',
                end: 'bottom bottom',
                toggleActions: 'play none none reverse'
            }
        });

        // Extend the connecting line
        tl.fromTo(lineRef.current,
            { scaleX: 0, opacity: 0 },
            { scaleX: 1, opacity: 1, duration: 1, ease: 'power3.inOut' }
        )
            // Pop in the center hub
            .fromTo(centerHubRef.current,
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' },
                '-=0.5'
            )
            // Slide in left cards
            .fromTo(leftCardsRef.current?.children ?? [],
                { x: -50, opacity: 0 },
                { x: 0, opacity: 1, stagger: 0.2, duration: 0.5, ease: 'power2.out' },
                '-=0.4'
            )
            // Slide in right cards
            .fromTo(rightCardsRef.current?.children ?? [],
                { x: 50, opacity: 0 },
                { x: 0, opacity: 1, stagger: 0.2, duration: 0.5, ease: 'power2.out' },
                '-=0.8'
            );

        return () => {
            // Cleanup if needed, though ScrollTrigger handles most auto-cleanup
        };
    }, []);

    return (
        <section ref={containerRef} className="relative py-24 bg-[#181111] overflow-hidden">
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#382929_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#181111] via-transparent to-[#181111] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center gap-16">

                {/* Hero Text */}
                <div className="text-center flex flex-col gap-4 max-w-3xl">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight"
                    >
                        The Missing Infrastructure for <br />
                        <span className="text-[#ea2a33] drop-shadow-[0_0_20px_rgba(234,42,51,0.5)]">Autonomous Agents</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-[#b89d9f] text-lg md:text-xl font-normal max-w-2xl mx-auto"
                    >
                        Why raw scraping fails and structured knowledge succeeds. A verifiable engine for the next generation of AI.
                    </motion.p>
                </div>

                {/* Technical Diagram */}
                <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 mt-4 relative">

                    {/* Connecting Line (Desktop) */}
                    <div ref={lineRef} className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-[#382929] -z-10 -translate-y-1/2 origin-center" />

                    {/* LEFT: Unreliable Inputs */}
                    <div ref={leftCardsRef} className="flex flex-col gap-6 w-full max-w-[320px] group">
                        <div className="text-[#ea2a33] font-bold text-sm tracking-widest uppercase text-center mb-2 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Unreliable Inputs
                        </div>

                        {/* Card 1 */}
                        <div className="bg-[#261c1c] border border-[#382929] p-5 rounded-xl flex items-center gap-4 relative overflow-hidden transition-transform hover:-translate-y-1">
                            <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />
                            <div className="w-12 h-12 rounded-lg bg-[#2a1d1d] flex items-center justify-center border border-[#382929] shrink-0 text-red-400">
                                <FileX className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate">Flaky Scrapers</h3>
                                <p className="text-xs text-[#b89d9f]">HTML parsing errors</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center text-[#ea2a33]">
                                <Activity className="w-3 h-3" />
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[#261c1c] border border-[#382929] p-5 rounded-xl flex items-center gap-4 relative overflow-hidden transition-transform hover:-translate-y-1">
                            <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />
                            <div className="w-12 h-12 rounded-lg bg-[#2a1d1d] flex items-center justify-center border border-[#382929] shrink-0 text-red-400">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate">Broken RAG</h3>
                                <p className="text-xs text-[#b89d9f]">Hallucination risk</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center text-[#ea2a33]">
                                <Activity className="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                    {/* CENTER: The Core (Knowledge Layer) */}
                    <div ref={centerHubRef} className="flex flex-col items-center justify-center relative shrink-0 z-20 my-8 lg:my-0">
                        {/* Glows */}
                        <div className="absolute inset-0 bg-[#ea2a33]/20 blur-[60px] rounded-full" />

                        <div className="relative bg-[#181111] border border-[#ea2a33]/50 shadow-[0_0_40px_-10px_rgba(234,42,51,0.4)] p-1 rounded-2xl w-[280px] h-[340px] flex flex-col">
                            {/* Header Bar */}
                            <div className="h-8 w-full bg-[#261c1c] rounded-t-xl flex items-center px-4 gap-2 border-b border-[#382929]">
                                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                                <div className="ml-auto text-[10px] text-[#ea2a33] font-mono tracking-widest">API_ACTIVE</div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6 relative">
                                {/* SVG Background Pattern Placeholder */}
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#261c1c] to-[#181111] border border-[#ea2a33]/30 flex items-center justify-center relative shadow-inner">
                                    <div className="absolute inset-0 border-2 border-[#ea2a33]/20 rounded-full animate-pulse" />
                                    <Network className="w-12 h-12 text-[#ea2a33] drop-shadow-[0_0_8px_rgba(234,42,51,0.8)]" />
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-white text-xl font-bold mb-1">Knowledge Layer</h3>
                                    <p className="text-xs text-[#b89d9f] font-mono bg-[#261c1c] px-2 py-1 rounded inline-block">v2.0.4 stable</p>
                                </div>

                                <div className="w-full h-1 bg-[#261c1c] rounded-full overflow-hidden">
                                    <motion.div
                                        animate={{ width: ["0%", "70%", "60%", "90%"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="h-full bg-[#ea2a33]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Reliable Outputs */}
                    <div ref={rightCardsRef} className="flex flex-col gap-6 w-full max-w-[320px]">
                        <div className="text-green-500 font-bold text-sm tracking-widest uppercase text-center mb-2 flex items-center justify-center gap-2">
                            Reliable Outputs
                            <CheckCircle className="w-4 h-4" />
                        </div>

                        {/* Card 1 */}
                        <div className="bg-[#261c1c] border border-green-900/50 p-5 rounded-xl flex items-center gap-4 relative overflow-hidden transition-transform hover:-translate-y-1 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.1)]">
                            <div className="absolute inset-0 bg-green-900/5 pointer-events-none" />
                            <div className="w-12 h-12 rounded-lg bg-[#1c261e] flex items-center justify-center border border-green-900/30 shrink-0 text-green-400">
                                <Database className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate">Structured JSON</h3>
                                <p className="text-xs text-[#b89d9f]">Schema-compliant data</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center text-green-500">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[#261c1c] border border-green-900/50 p-5 rounded-xl flex items-center gap-4 relative overflow-hidden transition-transform hover:-translate-y-1 shadow-[0_4px_20px_-10px_rgba(34,197,94,0.1)]">
                            <div className="absolute inset-0 bg-green-900/5 pointer-events-none" />
                            <div className="w-12 h-12 rounded-lg bg-[#1c261e] flex items-center justify-center border border-green-900/30 shrink-0 text-green-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold truncate">Verified Facts</h3>
                                <p className="text-xs text-[#b89d9f]">With citation links</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center text-green-500">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                </div>

                {/* CTA Section */}
                <div className="w-full max-w-2xl bg-[#261c1c] border border-[#382929] rounded-2xl p-8 md:p-10 text-center mt-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ea2a33] to-transparent opacity-50" />
                    <h3 className="text-2xl font-bold text-white mb-3">Ready to build reliable agents?</h3>
                    <p className="text-[#b89d9f] mb-8">Stop debugging scrapers and start building intelligence. Get your API key today.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/dashboard" className="w-full sm:w-auto">
                            <button className="w-full bg-[#ea2a33] hover:bg-red-600 transition-colors text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
                                <Key className="w-5 h-5" />
                                Get API Access
                            </button>
                        </Link>
                        <Link href="/docs" className="w-full sm:w-auto">
                            <button className="w-full bg-transparent hover:bg-[#382929] transition-colors text-white font-medium py-3 px-8 rounded-lg border border-[#382929] flex items-center justify-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Read Documentation
                            </button>
                        </Link>
                    </div>
                </div>

            </div>
        </section>
    );
};
