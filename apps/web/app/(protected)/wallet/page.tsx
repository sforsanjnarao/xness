'use client'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { balanceApi, Balance } from '@/lib/api';
import { Wallet, Bitcoin, CircleDollarSign } from 'lucide-react';

const ASSETS: { symbol: keyof Balance; name: string; icon: React.ReactNode }[] = [
  { symbol: 'USDC', name: 'USDC', icon: <CircleDollarSign className="h-6 w-6" /> },
  { symbol: 'BTC', name: 'Bitcoin', icon: <Bitcoin className="h-6 w-6" /> },
  { symbol: 'ETH', name: 'Ethereum', icon: <Wallet className="h-6 w-6" /> },
  { symbol: 'SOL', name: 'Solana', icon: <Wallet className="h-6 w-6" /> },
];

export default function WalletPage() {
  const [depositSymbol, setDepositSymbol] = useState<keyof Balance>('USDC');
  const [depositAmount, setDepositAmount] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch balance
  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const { data, error } = await balanceApi.getBalance();
      if (error) throw new Error(error);
      return data;
    },
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await balanceApi.deposit({
        symbol: depositSymbol,
        amount: parseFloat(depositAmount),
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast({
        title: 'Deposit Successful',
        description: `${depositAmount} ${depositSymbol} has been deposited.`,
      });
      setDepositAmount('');
    },
    onError: (error) => {
      toast({
        title: 'Deposit Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid deposit amount.',
        variant: 'destructive',
      });
      return;
    }
    depositMutation.mutate();
  };
  const formatBalance = (value?: number) =>
  typeof value === "number" ? value.toFixed(4) : "0.0000";
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-bold">Wallet</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ASSETS.map((asset) => (
            <div
              key={asset.symbol}
              className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="p-2 bg-secondary rounded-lg text-primary">
                {asset.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{asset.name}</p>
                  <p className="text-lg font-bold">
                    {isLoading ? "..." : formatBalance(balanceData?.[asset.symbol])}
                  </p>
              </div>
            </div>
          ))}
        </div>

        {/* Deposit Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Deposit</h2>
          
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select
                value={depositSymbol}
                onValueChange={(value) => setDepositSymbol(value as keyof Balance)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.name} ({asset.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <Button
              onClick={handleDeposit}
              disabled={depositMutation.isPending}
              className="w-full bg-primary hover:bg-destructive/90"
            >
              {depositMutation.isPending ? 'Processing...' : 'Deposit'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
