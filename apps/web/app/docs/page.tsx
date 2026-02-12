"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  BookOpen, Terminal, Activity, Wallet, 
  Smartphone, Monitor, AlertTriangle, 
  CheckCircle2, XCircle, ArrowLeft,
  ChevronRight, Zap
} from "lucide-react";
import { useState, useEffect } from "react";

// --- COMPONENT: GUIDE NAVIGATION (STICKY SIDEBAR) ---
const sections = [
  { id: "intro", label: "1. What is Velocity?" },
  { id: "getting-started", label: "2. Getting Started" },
  { id: "chart", label: "3. The Price Chart" },
  { id: "balance", label: "4. Virtual Balance" },
  { id: "simulation", label: "5. Simulation Mode" },
  { id: "trades", label: "6. Recent Trades" },
  { id: "devices", label: "7. Mobile vs Desktop" },
  { id: "tips", label: "8. Pro Tips" },
  { id: "disclaimer", label: "9. Disclaimer" },
];

function GuideSidebar() {
  const [activeSection, setActiveSection] = useState("intro");

  // Simple scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24 border-l border-zinc-800 ml-4">
        {sections.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className={`group flex items-center w-full text-left px-4 py-2 text-sm font-medium transition-colors border-l-2 -ml-[2px]
              ${activeSection === item.id 
                ? "border-[#ef4444] text-white" 
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- COMPONENT: COMPACT HEADER ---
function GuideHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md h-14">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span className="font-extrabold text-lg tracking-tighter text-white">
              Velocity<span className="text-[#ef4444]">_Docs</span>
            </span>
          </Link>
        </div>
        <div>
            <Link href="/market">
                <Button size="sm" variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 h-8 text-xs">
                    Launch Terminal
                </Button>
            </Link>
        </div>
      </div>
    </header>
  );
}

// --- MAIN PAGE ---
export default function UserGuide() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30 font-sans">
      
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px] opacity-10" />
      </div>

      <GuideHeader />

      <main className="relative z-10 pt-32 pb-24 container mx-auto px-4 max-w-6xl">
        
        {/* Title Area */}
        <div className="mb-16 border-b border-zinc-800 pb-10">
            <div className="inline-flex items-center gap-2 text-[#ef4444] text-xs font-mono mb-4 tracking-wider uppercase bg-red-500/10 px-2 py-1 rounded">
                <BookOpen size={12} />
                Official Manual V1.0
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Velocity User Guide
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl">
                Learn. Trade. Practice — without risk. <br />
                Master the terminal mechanics before entering real markets.
            </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
            
            {/* Sidebar Navigation */}
            <GuideSidebar />

            {/* Content Area */}
            <div className="flex-1 space-y-20 max-w-3xl">

                {/* 1. What is Velocity */}
                <section id="intro" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">01.</span> What Is Velocity?
                    </h2>
                    <div className="prose prose-invert max-w-none text-zinc-400">
                        <p className="mb-4">
                            Velocity is a trading practice platform that lets you experience real-market behavior using virtual money. 
                            It bridges the gap between theory and execution.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                                <Activity className="text-emerald-500 mb-2" size={20} />
                                <h4 className="text-white font-bold text-sm mb-1">Live Market Data</h4>
                                <p className="text-xs">Watch real-time price movements synced with major exchanges.</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                                <Terminal className="text-blue-500 mb-2" size={20} />
                                <h4 className="text-white font-bold text-sm mb-1">Execution Practice</h4>
                                <p className="text-xs">Learn how buying, selling, and slippage work instantly.</p>
                            </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 items-start">
                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-red-200">
                                <strong>Warning:</strong> Velocity uses simulation mode only. No real trades are executed. No real losses are incurred.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 2. Getting Started */}
                <section id="getting-started" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">02.</span> Getting Started
                    </h2>
                    <p className="text-zinc-400 mb-6">
                        When you open Velocity, you’ll see the <strong>Trading Terminal</strong>. This is your cockpit. 
                        Everything updates in real-time to simulate the pressure of a live trading environment.
                    </p>
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Zap size={100} className="text-zinc-800" />
                        </div>
                        <ul className="space-y-3 relative z-10">
                            <li className="flex items-center gap-3 text-zinc-300">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">1</div>
                                <span>📊 Live Price Chart</span>
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">2</div>
                                <span>💰 Virtual Balance Display</span>
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">3</div>
                                <span>🔴 Simulation Status Indicator</span>
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">4</div>
                                <span>📈 Recent Trades Panel (Desktop)</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 3. The Chart */}
                <section id="chart" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">03.</span> Understanding the Price Chart
                    </h2>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 text-zinc-400 space-y-4">
                            <p>
                                The chart visualizes market sentiment. It shows how the price moves over time.
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Price moves <strong>UP</strong> → Market is rising (Bullish)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    <span>Price moves <strong>DOWN</strong> → Market is falling (Bearish)</span>
                                </li>
                            </ul>
                            <p className="text-xs bg-zinc-900 p-3 rounded border border-zinc-800">
                                <span className="text-zinc-500 font-mono uppercase mr-2">Note:</span>
                                The large number displayed is the <strong>Index Price</strong>. This is the global reference price for the asset.
                            </p>
                        </div>
                        {/* Mini Visual Chart Representation */}
                        <div className="w-full md:w-64 h-32 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 flex items-end justify-between px-4 pb-4 gap-1 opacity-50">
                                <div className="w-2 h-10 bg-red-500/50 rounded-sm"></div>
                                <div className="w-2 h-16 bg-emerald-500/50 rounded-sm"></div>
                                <div className="w-2 h-8 bg-red-500/50 rounded-sm"></div>
                                <div className="w-2 h-20 bg-emerald-500/50 rounded-sm"></div>
                                <div className="w-2 h-12 bg-emerald-500/50 rounded-sm"></div>
                             </div>
                             <span className="relative z-10 font-mono text-xl font-bold">64,230.50</span>
                        </div>
                    </div>
                </section>

                {/* 4. Virtual Balance */}
                <section id="balance" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">04.</span> Virtual Balance
                    </h2>
                    <div className="bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-zinc-400 mb-2">You start with a practice portfolio.</p>
                            <h3 className="text-3xl font-mono font-bold text-white mb-1">10,000.00 <span className="text-zinc-600 text-lg">USDC</span></h3>
                            <p className="text-xs text-emerald-500 font-mono flex items-center gap-1">
                                <Wallet size={12} /> Virtual Funds Loaded
                            </p>
                        </div>
                        <div className="text-sm text-zinc-500 space-y-2 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                            <p>• Not real money (Fake USDC)</p>
                            <p>• Used only for practice</p>
                            <p>• Resets automatically (in Sim mode)</p>
                        </div>
                    </div>
                </section>

                {/* 5. Simulation Mode */}
                <section id="simulation" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">05.</span> Simulation Mode
                    </h2>
                    <p className="text-zinc-400 mb-6">
                        Velocity is built for safety. We clearly label the environment so you never get confused.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">Simulation Online</span>
                            </div>
                            <h4 className="font-bold text-white mb-2">What this means:</h4>
                            <ul className="text-sm text-zinc-500 space-y-1 list-disc pl-4">
                                <li>Trades are not sent to any exchange.</li>
                                <li>No gas fees or real costs.</li>
                                <li>Perfect for testing risky strategies.</li>
                            </ul>
                        </div>
                        
                        <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-lg flex flex-col justify-center">
                            <h4 className="font-bold text-white mb-2">Learning Objectives:</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Test strategies safely
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Learn risk management
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Understand volatility
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. Trades Panel */}
                <section id="trades" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">06.</span> Recent Trades Panel
                    </h2>
                    <p className="text-zinc-400 mb-6">
                        On desktop screens, the right-side panel shows the "tape" — a stream of trades happening in the market.
                    </p>
                    <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="bg-[#0c0c0e] p-4 text-center">
                            <span className="text-emerald-500 font-mono font-bold text-lg">Green</span>
                            <p className="text-xs text-zinc-500 mt-1">Buying Pressure</p>
                        </div>
                        <div className="bg-[#0c0c0e] p-4 text-center">
                            <span className="text-red-500 font-mono font-bold text-lg">Red</span>
                            <p className="text-xs text-zinc-500 mt-1">Selling Pressure</p>
                        </div>
                    </div>
                </section>

                {/* 7. Devices */}
                <section id="devices" className="scroll-mt-28">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">07.</span> Mobile vs Desktop
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Mobile Card */}
                        <div className="border border-zinc-800 bg-[#0c0c0e] rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4 text-white">
                                <Smartphone className="text-zinc-500" />
                                <h3 className="font-bold">Mobile Experience</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Focus on Chart & Balance</li>
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Clean, distraction-free view</li>
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Balance badge centered at bottom</li>
                            </ul>
                        </div>

                        {/* Desktop Card */}
                        <div className="border border-zinc-800 bg-[#0c0c0e] rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4 text-white">
                                <Monitor className="text-zinc-500" />
                                <h3 className="font-bold">Desktop Experience</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Full Trading Terminal</li>
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Order Book & Recent Trades visible</li>
                                <li className="flex gap-2"><ChevronRight size={14} className="mt-1 text-[#ef4444]" /> Professional layout</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 8. Tips */}
                <section id="tips" className="scroll-mt-28">
                     <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">08.</span> Tips for New Users
                    </h2>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-zinc-300">Start by just watching the chart for 5 minutes.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-zinc-300">Don't rush trades. Waiting is a position.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-zinc-300">Practice consistency, not lucky profits.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-zinc-300">Treat virtual money as if it were real.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 9. Disclaimer / Comparison */}
                <section id="disclaimer" className="scroll-mt-28">
                     <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-[#ef4444]">09.</span> What Velocity Is (and Isn't)
                    </h2>

                    <div className="grid md:grid-cols-2 gap-0 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="bg-emerald-950/10 p-8 border-b md:border-b-0 md:border-r border-zinc-800">
                            <h3 className="font-bold text-emerald-500 mb-4 flex items-center gap-2">
                                <CheckCircle2 size={20} /> Velocity IS:
                            </h3>
                            <ul className="space-y-3 text-zinc-300 text-sm">
                                <li className="flex gap-2">✔ A professional learning tool</li>
                                <li className="flex gap-2">✔ A realistic market simulator</li>
                                <li className="flex gap-2">✔ A safe sandbox for beginners</li>
                            </ul>
                        </div>
                        <div className="bg-red-950/10 p-8">
                            <h3 className="font-bold text-red-500 mb-4 flex items-center gap-2">
                                <XCircle size={20} /> Velocity is NOT:
                            </h3>
                            <ul className="space-y-3 text-zinc-300 text-sm">
                                <li className="flex gap-2">✖ A real crypto exchange</li>
                                <li className="flex gap-2">✖ A brokerage firm</li>
                                <li className="flex gap-2">✖ Financial advice</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <div className="pt-12 mt-12 border-t border-zinc-800 text-center">
                    <p className="text-zinc-400 mb-6">Ready to apply what you've learned?</p>
                    <Link href="/market">
                        <Button className="bg-white text-black hover:bg-zinc-200 font-bold px-8 h-10">
                            Open Terminal
                        </Button>
                    </Link>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}