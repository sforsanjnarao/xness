"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Activity, Lock, Cpu,
  Terminal, BarChart2, ShieldAlert,
  Wallet, BookOpen, GraduationCap,
  ArrowDown, MousePointer2, Menu
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";

// --- COMPONENT: RESPONSIVE CHART ---
function TerminalChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 220,
      rightPriceScale: { 
        borderVisible: false, 
        scaleMargins: { top: 0.1, bottom: 0.1 },
        visible: true
      },
      timeScale: { 
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { 
        vertLine: { labelVisible: false }, 
        horzLine: { labelVisible: false } 
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', 
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Generate Dummy Data
    const data = [];
    let price = 64000;
    let date = new Date('2024-01-01');

    for (let i = 0; i < 50; i++) {
      const volatility = 400;
      const change = (Math.random() - 0.5) * volatility;
      const open = price;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      const timeString = date.toISOString().split('T')[0];
      
      data.push({ time: timeString, open, high, low, close });
      price = close;
      date.setDate(date.getDate() + 1);
    }

    series.setData(data as any);
    chart.timeScale().fitContent();

    // Responsive Resize Handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };

  }, []);

  return <div ref={chartContainerRef} className="w-full" />;
}

// --- COMPONENT: DEFINITION DECONSTRUCTOR (MOBILE OPTIMIZED) ---
const definitions = [
  {
    id: "centralized",
    label: "Centralized",
    desc: "Like Binance or Bybit. A single engine matches orders instantly. Fast execution, no gas fees.",
    icon: <Zap className="text-amber-500" size={24} />,
    color: "from-amber-500/20 to-orange-500/20"
  },
  {
    id: "perpetual",
    label: "Perpetual",
    desc: "A contract with no expiry date. Hold your position forever (as long as you have margin).",
    icon: <Activity className="text-cyan-500" size={24} />,
    color: "from-cyan-500/20 to-blue-500/20"
  },
  {
    id: "futures",
    label: "Futures",
    desc: "Bet on price movement (Long/Short) without owning the asset. Profit from dumps.",
    icon: <BarChart2 className="text-purple-500" size={24} />,
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    id: "simulator",
    label: "Simulator",
    desc: "Fake USDC, Real Market Data. The only place to learn liquidation risks safely.",
    icon: <ShieldAlert className="text-emerald-500" size={24} />,
    color: "from-emerald-500/20 to-green-500/20"
  }
];

function ConceptDeconstructor() {
  const [activeId, setActiveId] = useState<string>("simulator");
  const activeItem = definitions.find(d => d.id === activeId);

  return (
    <div className="w-full py-16 md:py-24 relative overflow-hidden bg-zinc-900/10">
      {/* Mobile-friendly Background Blur */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          key={activeId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className={`w-[300px] h-[300px] md:w-[600px] bg-gradient-to-r ${activeItem?.color} rounded-full blur-[80px] md:blur-[100px] opacity-30 md:opacity-40`}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <p className="text-zinc-500 font-mono text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4">Core Architecture</p>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            What exactly is <span className="text-[#ef4444]">velocity</span>?
          </h2>
        </div>

        {/* Interactive Sentence */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-6 mb-12 md:mb-20 select-none">
          {definitions.map((item) => {
            const isActive = activeId === item.id;
            
            return (
              <div key={item.id} className="relative group">
                <motion.button
                  onClick={() => setActiveId(item.id)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative z-20 px-4 py-2 md:px-6 md:py-3 rounded-lg text-base md:text-2xl font-mono font-semibold tracking-tight transition-colors duration-300
                    ${isActive ? "text-white" : "text-zinc-600 hover:text-zinc-300"}
                  `}
                >
                  {item.label}
                  
                  {/* Sliding Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-zinc-800/80 border border-zinc-700/50 rounded-lg -z-10 backdrop-blur-sm shadow-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>

                {/* Animated Arrow - Adjusted top spacing for mobile */}
                {isActive && (
                  <motion.div 
                    layoutId="pointer-arrow"
                    className="absolute left-1/2 -translate-x-1/2 top-full pt-2 md:pt-4 text-[#ef4444] z-20"
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <ArrowDown className="w-5 h-5 md:w-8 md:h-8 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation Card */}
        <div className="max-w-3xl mx-auto min-h-[220px] md:min-h-[180px] relative perspective-1000">
          <AnimatePresence mode="wait">
            {definitions.map((item) => (
              item.id === activeId && (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20, rotateX: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, rotateX: 10, scale: 0.95 }}
                  transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                  className="relative overflow-hidden bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl"
                >
                    {/* Inner Gradient Highlight */}
                    <div className={`absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-gradient-to-bl ${item.color} blur-[40px] md:blur-[60px] opacity-20 pointer-events-none`} />

                    <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 relative z-10">
                        <div className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner shrink-0 backdrop-blur-md">
                            {item.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2 md:mb-3">
                                <h3 className="text-lg md:text-xl font-bold text-white">
                                {item.label}
                                </h3>
                                <span className="text-[10px] bg-white/5 border border-white/5 text-zinc-400 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">
                                Definition
                                </span>
                            </div>
                            <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-medium">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENT: NAV ---
function CompactHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md h-14">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-lg md:text-xl tracking-tighter text-white">
              velocity<span className="text-[#ef4444]">.</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Hide metrics on mobile */}
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-zinc-600 mr-4 border-r border-white/10 pr-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              LIVE FEED
            </span>
            <span>USDC-PERP</span>
          </div>
          
          <Link href="/signin" className="hidden sm:block text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/trade">
            <Button size="sm" className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[10px] md:text-xs font-semibold h-8 px-3 md:px-4 rounded-md">
              Launch <span className="hidden sm:inline ml-1">Simulator</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

// --- COMPONENT: FEATURE ITEM ---
function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-5 md:p-6 bg-[#0c0c0e] hover:bg-[#121214] transition-colors group border-b md:border-b-0 md:border-r border-zinc-800 last:border-0">
      <div className="mb-3 md:mb-4 text-zinc-500 group-hover:text-[#ef4444] transition-colors">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-zinc-200 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{desc}</p>
    </div>
  )
}

// --- MAIN PAGE ---
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30 overflow-x-hidden font-sans">
      
      {/* TECHNICAL GRID BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />
      </div>

      <CompactHeader />

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="pt-24 pb-12 md:pt-32 md:pb-20 container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-10 md:gap-12 items-center">
            
            {/* LEFT: COPY */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left"
            >
              <div className="inline-flex items-center justify-center lg:justify-start gap-2 text-[#ef4444] text-xs font-mono mb-4 tracking-wider uppercase">
                <span className="bg-red-500/10 px-2 py-1 rounded flex items-center gap-2">
                    <Terminal size={12} />
                    CEX Simulator V1.0
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
                Learn Perpetual Futures <br />
                <span className="text-zinc-500">without the risk.</span>
              </h1>

              <p className="text-sm text-zinc-400 mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                A centralized perpetual futures exchange simulator. Trade BTC, ETH, and SOL with fake USDC using real market flow.
              </p>

              <div className="flex gap-3 justify-center lg:justify-start">
                <Link href="/signup">
                  <Button className="bg-white text-black hover:bg-zinc-200 h-9 px-6 text-sm font-medium">
                    Start Risk-Free
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 h-9 px-6 text-sm">
                    How it works
                  </Button>
                </Link>
              </div>

              {/* Small Stat Row */}
              <div className="mt-10 md:mt-12 grid grid-cols-3 gap-2 md:gap-6 border-t border-zinc-900 pt-6">
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-1">Asset</div>
                  <div className="text-sm md:text-lg font-mono font-medium text-emerald-500">Virtual USDC</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-1">Market Data</div>
                  <div className="text-sm md:text-lg font-mono font-medium text-white">Live <span className="text-[10px] text-zinc-500 align-top">REAL</span></div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-1">Risk</div>
                  <div className="text-sm md:text-lg font-mono font-medium text-[#ef4444]">0%</div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT: TERMINAL PREVIEW */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-7 relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg blur opacity-20" />
              
              <div className="relative rounded-lg border border-zinc-800 bg-[#0c0c0e] shadow-2xl overflow-hidden text-left">
                {/* Terminal Header */}
                <div className="h-8 border-b border-zinc-800 flex items-center justify-between px-3 bg-[#131315]">
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-white">BTC-USDC</span>
                      <span className="hidden sm:inline text-xs font-mono text-zinc-500 bg-zinc-900 px-1 rounded">PERPETUAL</span>
                   </div>
                   <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-zinc-500 font-mono">SIMULATION</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 h-[280px] sm:h-[320px]">
                  {/* Chart Area */}
                  <div className="col-span-1 sm:col-span-3 border-r-0 sm:border-r border-zinc-800 p-4 relative">
                     <div className="absolute top-4 left-4 z-10">
                        <div className="text-xl sm:text-2xl font-mono font-bold text-white">64,230.50</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-1">INDEX PRICE (LIVE)</div>
                     </div>
                     <div className="mt-8 opacity-80 h-full">
                        <TerminalChart />
                     </div>
                  </div>

                  {/* Orderbook - Hidden on super small screens, visible on sm+ */}
                  <div className="hidden sm:flex col-span-1 bg-[#09090b] flex-col text-[10px] font-mono">
                     <div className="p-2 text-zinc-500 border-b border-zinc-800">Recent Trades</div>
                     <div className="flex-1 overflow-hidden p-1 space-y-1">
                        {[...Array(15)].map((_, i) => {
                            const isBuy = Math.random() > 0.5;
                            return (
                                <div key={i} className="flex justify-between">
                                    <span className={isBuy ? "text-emerald-500" : "text-red-500"}>
                                        64,{Math.floor(200 + Math.random() * 50)}
                                    </span>
                                    <span className="text-zinc-600">{(Math.random() * 0.5).toFixed(3)}</span>
                                </div>
                            )
                        })}
                     </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge - Stacked on mobile */}
              <div className="absolute -bottom-6 -left-6   bg-zinc-900/90 backdrop-blur border border-zinc-800 p-4 rounded-lg shadow-xl flex items-center gap-4">
                 <div className="p-2 bg-emerald-500/10 rounded-md text-emerald-500">
                   <Wallet size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-zinc-400 font-medium">Virtual Balance</div>
                    <div className="text-sm font-bold text-white">10,000.00 USDC</div>
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CONCEPT DECONSTRUCTOR SECTION */}
        <ConceptDeconstructor />

        {/* FEATURE STRIP */}
        <section className="container mx-auto px-4 pb-20 pt-10">
            <div className="mb-8 text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">Simulation Mechanics</h3>
                <p className="text-zinc-400 text-sm">Experience the full lifecycle of a futures trade.</p>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden gap-px">
            <FeatureItem 
                icon={<MousePointer2 />} 
                title="Market Orders" 
                desc="Instantly open Long/Short positions at current prices with zero latency." 
            />
            <FeatureItem 
                icon={<Activity />} 
                title="Real Volatility" 
                desc="Prices are synced with live markets. Learn to handle real slippage." 
            />
            <FeatureItem 
                icon={<ShieldAlert />} 
                title="Liquidation Logic" 
                desc="Understand exactly when and why your position gets forcefully closed." 
            />
            <FeatureItem 
                icon={<GraduationCap />} 
                title="Silent Teacher" 
                desc="Get feedback on why your Stop Loss triggered or how margin was used." 
            />
          </div>
        </section>

        {/* DISCLAIMER FOOTER */}
        <footer className="border-t border-zinc-900 bg-[#08080a] py-12">
            <div className="container mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 text-zinc-600 mb-4">
                    <ShieldAlert size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Educational Sandbox</span>
                </div>
                <p className="text-zinc-500 text-xs max-w-2xl mx-auto leading-relaxed">
                    velocity is a centralized perpetual futures exchange (CEX) simulator for educational purposes only. 
                    All assets and balances are virtual (fake USDC). No real trading, deposits, or withdrawals are supported. 
                    This platform is designed to teach mechanics without financial risk.
                </p>
                <div className="mt-8 text-zinc-700 text-[10px] font-mono">
                    © {new Date().getFullYear()} VELOCITY PROTOCOL. SYSTEM ONLINE.
                </div>
            </div>
        </footer>

      </main>
    </div>
  );
}