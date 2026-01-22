"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 z-50 w-full border-b border-border/20 bg-background/70 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
            X
          </div>
          xness
        </Link>

        <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Market Open
          </span>
          <span>Latency: 42ms</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/signin" className="text-sm text-muted-foreground hover:text-primary">
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}