'use client'
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Wallet } from 'lucide-react';
import { JSX } from "react";

interface HeaderProps {
  usdcBalance: number
}

export function Header({ usdcBalance }: HeaderProps):JSX.Element {
  const { user, signOut } = useAuth();
  const navigate = useRouter();
  const pathname = usePathname(); 

  const handleSignOut = async () => {
    await signOut();
    navigate.push('/signin');
  };
  const isTrade = pathname === '/trade';
  const isWallet = pathname === '/wallet';

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/trade" className="text-xl font-bold text-primary">
          Velocity
        </Link>
        
        <nav className="flex items-center gap-1">
          <Link href="/trade">
            <Button 
            size="sm"
              className={
                isTrade
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "text-foreground hover:text-primary"
              }
              variant={isTrade ? "default" : "ghost"}
            >
              Trade
            </Button>
          </Link>
          <Link href="/wallet">
            <Button 
            size="sm"
              className={
                isWallet
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "text-foreground hover:text-primary"
              }
              variant={isWallet ? "default" : "ghost"}
            >
              Wallet
            </Button>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">
              {usdcBalance?.toFixed(4)} {}
            </span>
          </div>
        }

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground border-b border-border mb-1">
                {user.email}
              </div>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
