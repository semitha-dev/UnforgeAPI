import React from 'react';
import { ArrowRight, Box, Database, CheckCircle, Zap, FileJson, Search, BarChart3, Webhook, Key } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const InfrastructureSection = () => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
            // 1. Header Animation
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: headerRef.current,
                    start: "top 80%",
                    end: "bottom 60%",
                    toggleActions: "play none none reverse"
                }
            });

            tl.from("span.text-xs", { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" })
                .from("h1", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.4")
                .from("p", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.6");

            // 2. Feature Rows Animation
            const features = gsap.utils.toArray<HTMLElement>(".feature-row");
            features.forEach((feature, i) => {
                const direction = i % 2 === 0 ? -50 : 50; // Text slides from left/right

                gsap.from(feature.querySelectorAll(".feature-text"), {
                    scrollTrigger: {
                        trigger: feature,
                        start: "top 75%",
                        toggleActions: "play none none reverse"
                    },
                    x: direction,
                    opacity: 0,
                    duration: 1,
                    ease: "power3.out"
                });

                gsap.from(feature.querySelectorAll(".perspective-1000"), {
                    scrollTrigger: {
                        trigger: feature,
                        start: "top 75%",
                        toggleActions: "play none none reverse"
                    },
                    rotateY: i % 2 === 0 ? 15 : -15,
                    opacity: 0,
                    scale: 0.9,
                    duration: 1.2,
                    ease: "power2.out"
                });
            });

            // 3. Flow Line Animation - Grow on Scroll
            gsap.from(".flow-line", {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 60%",
                    end: "bottom 80%",
                    scrub: 1
                },
                height: 0,
                opacity: 0
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 overflow-hidden">
            <div ref={headerRef} className="text-center mb-32 max-w-5xl mx-auto relative">
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-8 border border-white/10 rounded-full bg-white/5 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    <span className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-300">Next Gen Infrastructure</span>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight mb-8 text-white">
                    Everything your agent needs to
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 pb-2">understand the world.</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-400 font-light max-w-3xl mx-auto leading-relaxed">
                    Power your AI with structured data, real-time extraction, and seamless integrations. A unified system designed for the next generation of intelligent agents.
                </p>
            </div>

            <div className="hidden md:block absolute left-1/2 top-[400px] bottom-20 w-px -translate-x-1/2 z-0">
                <div className="h-full w-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent"></div>
                <div className="flow-line absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-transparent via-indigo-400 to-transparent blur-[2px] animate-[flow_3s_linear_infinite]"></div>
            </div>

            <div className="space-y-32 md:space-y-48 relative z-10">
                {/* Feature 1: Custom Schemas */}
                <div className="feature-row group relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                    <div className="feature-text order-2 md:order-1 relative">
                        <div className="absolute -left-12 -top-12 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Custom Schemas</h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                            Stop parsing markdown manually. Define the exact JSON structure you need, and we'll fill it with clean, real-time data from any source.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-indigo-400 font-medium group-hover:gap-4 transition-all duration-300 cursor-pointer">
                            <span>Read documentation</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="order-1 md:order-2 perspective-1000">
                        <div className="relative rounded-2xl overflow-hidden bg-[#0D0D0D] border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] font-mono text-sm leading-relaxed backdrop-blur-xl transform md:rotate-y-[-5deg] md:rotate-x-[5deg] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-[1.02]">
                            {/* Window Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                    <span className="text-gray-300">schema.json</span>
                                </div>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <div className="text-gray-500 mb-2 select-none">// Define your JSON schema</div>
                                <div className="text-purple-400">{'{'}</div>
                                <div className="pl-4 text-white">"query"<span className="text-blue-400">:</span> <span className="text-green-400">"Tesla stock analysis"</span>,</div>
                                <div className="pl-4 text-white">"mode"<span className="text-blue-400">:</span> <span className="text-green-400">"schema"</span>,</div>
                                <div className="pl-4 text-white">"preset"<span className="text-blue-400">:</span> <span className="text-green-400">"stocks"</span>,</div>
                                <div className="pl-4 text-white">"schema"<span className="text-blue-400">:</span> {'{'}</div>
                                <div className="pl-8 text-white">"company_name"<span className="text-blue-400">:</span> <span className="text-green-400">"string"</span>,</div>
                                <div className="pl-8 text-white">"current_price"<span className="text-blue-400">:</span> <span className="text-green-400">"number"</span>,</div>
                                <div className="pl-8 text-white">"price_change"<span className="text-blue-400">:</span> <span className="text-green-400">"string"</span>,</div>
                                <div className="pl-8 text-white">"key_risks"<span className="text-blue-400">:</span> <span className="text-yellow-400">[</span><span className="text-green-400">"string"</span><span className="text-yellow-400">]</span>,</div>
                                <div className="pl-8 text-white">"analyst_rating"<span className="text-blue-400">:</span> <span className="text-green-400">"string"</span></div>
                                <div className="pl-4 text-white">{'}'}</div>
                                <div className="text-purple-400">{'}'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 2: Agentic Reasoning */}
                <div className="feature-row group relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                    <div className="order-1 perspective-1000">
                        <div className="relative rounded-2xl overflow-hidden bg-[#0D0D0D] border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] font-mono text-sm leading-relaxed backdrop-blur-xl transform md:rotate-y-[5deg] md:rotate-x-[5deg] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-[1.02]">
                            {/* Window Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                    <span className="text-gray-300">agentic.json</span>
                                </div>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <div className="text-gray-500 mb-2 select-none">// Enable iterative reasoning</div>
                                <div className="text-purple-400">{'{'}</div>
                                <div className="pl-4 text-white">"query"<span className="text-blue-400">:</span> <span className="text-green-400">"2026 AI market trends"</span>,</div>
                                <div className="pl-4 text-white">"mode"<span className="text-blue-400">:</span> <span className="text-green-400">"report"</span>,</div>
                                <div className="pl-4 text-white">"preset"<span className="text-blue-400">:</span> <span className="text-green-400">"tech"</span>,</div>
                                <div className="pl-4 text-fuchsia-400">"agentic_loop"<span className="text-blue-400">:</span> <span className="text-yellow-400">true</span></div>
                                <div className="text-purple-400">{'}'}</div>
                                <div className="text-gray-500 mt-4 select-none">// Iterates up to 3x to verify data</div>
                                <div className="text-gray-500 select-none">// Eliminates outdated predictions</div>
                            </div>
                        </div>
                    </div>
                    <div className="feature-text order-2 relative">

                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Agentic Reasoning</h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                            Iterative research that validates sources and eliminates hallucinations. Our reasoning layer detects outdated data and refines queries automatically for accurate, current results.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-fuchsia-400 font-medium group-hover:gap-4 transition-all duration-300 cursor-pointer">
                            <span>Read documentation</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Feature 3: Multi-Query Compare */}
                <div className="feature-row group relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                    <div className="feature-text order-2 md:order-1 relative">

                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Multi-Query Compare</h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                            Compare multiple topics in a single researched response. Aggregate data points effortlessly into a unified view for complex decision making.
                        </p>
                    </div>
                    <div className="order-1 md:order-2 perspective-1000">
                        <div className="relative min-h-[300px] flex items-center justify-center transform md:rotate-y-[-5deg] transition-transform duration-700 group-hover:rotate-0">
                            <div className="absolute z-20 glass-panel rounded-xl p-6 w-64 md:w-72 border-emerald-500/30 shadow-[0_0_50px_-10px_rgba(16,185,129,0.2)]">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="h-3 w-20 bg-emerald-500/40 rounded-full"></div>
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div className="space-y-3">
                                    <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                    <div className="h-2 w-3/4 bg-white/10 rounded-full"></div>
                                    <div className="h-2 w-5/6 bg-white/10 rounded-full"></div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-white/5 flex gap-4">
                                    <div className="h-8 flex-1 bg-emerald-500/10 rounded border border-emerald-500/20"></div>
                                    <div className="h-8 flex-1 bg-emerald-500/10 rounded border border-emerald-500/20"></div>
                                </div>
                            </div>
                            <div className="absolute z-10 left-0 md:left-10 top-4 md:top-8 w-64 md:w-72 h-48 glass-panel bg-slate-800/80 rounded-xl p-6 scale-90 -rotate-6 opacity-60 blur-[1px]"></div>
                            <div className="absolute z-10 right-0 md:right-10 top-4 md:top-8 w-64 md:w-72 h-48 glass-panel bg-slate-800/80 rounded-xl p-6 scale-90 rotate-6 opacity-60 blur-[1px]"></div>
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[80px] -z-10"></div>
                        </div>
                    </div>
                </div>

                {/* Feature 4: Webhook Delivery */}
                <div className="feature-row group relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                    <div className="order-1 perspective-1000">
                        <div className="relative glass-panel rounded-2xl p-8 transform md:rotate-y-[5deg] transition-transform duration-700 group-hover:rotate-0">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">POST /api/webhook</div>
                                <div className="ml-auto px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-mono font-bold border border-green-500/30">200 OK</div>
                            </div>
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex">
                                    <span className="text-pink-400 w-24">timestamp:</span>
                                    <span className="text-slate-300">1679823422</span>
                                </div>
                                <div className="flex">
                                    <span className="text-pink-400 w-24">event:</span>
                                    <span className="text-yellow-300">"job_completed"</span>
                                </div>
                                <div className="flex">
                                    <span className="text-pink-400 w-24">payload:</span>
                                    <span className="text-slate-500">{'{ ... }'}</span>
                                </div>
                                <div className="pt-4 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping"></div>
                                    <span className="text-xs text-pink-500/80">Transmission active</span>
                                </div>
                            </div>
                            <div className="absolute -inset-1 bg-pink-500/10 rounded-2xl blur-xl -z-10 group-hover:opacity-75 transition-opacity duration-500"></div>
                        </div>
                    </div>
                    <div className="feature-text order-2 relative">

                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Webhook Delivery</h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                            Async processing? We'll POST the JSON payload to your endpoint the millisecond it's ready. Reliable, retriable, and built for scale.
                        </p>
                    </div>
                </div>

            </div>
        </section>
    );
};
