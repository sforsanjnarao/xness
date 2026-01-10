'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Wallet } from 'lucide-react';
import { Balance } from '@/lib/api';

interface HeaderProps {
  balance?: Balance;
}

export function Header({ balance }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useRouter();

  const handleSignOut = async () => {
    await signOut();
    navigate.push('/signin');
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/trade" className="text-xl font-bold text-primary">
          Xness
        </Link>
        
        <nav className="flex items-center gap-1">
          <Link href="/trade">
            <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
              Trade
            </Button>
          </Link>
          <Link href="/wallet">
            <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
              Wallet
            </Button>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {balance && (
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">
              {(balance.BTC?? 0).toLocaleString()} USDC
            </span>
          </div>
        )}

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
