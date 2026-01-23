"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { JSX, useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element | null {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no user, redirect to signin
    if (!isLoading && !user) {
      router.replace("/signin");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center gap-4">
        {/* 
           Added a small visual pulse effect to the spinner 
           to look nicer on mobile screens 
        */}
        <div className="animate-spin h-8 w-8 border-t-2 border-primary border-r-2 border-r-transparent rounded-full" />
        <p className="text-sm text-muted-foreground animate-pulse">Initializing Velocity...</p>
      </div>
    );
  }

  // If we are finished loading and have no user, return null
  // (Effect will handle redirect)
  if (!user) return null;

  return <>{children}</>;
}