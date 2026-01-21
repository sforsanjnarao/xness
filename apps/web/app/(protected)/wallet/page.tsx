'use client'
import { JSX, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { balanceApi } from '@/lib/api';
import { CircleDollarSign, ArrowUpRight } from 'lucide-react';

export default function WalletPage():JSX.Element {
  const [depositAmount, setDepositAmount] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch balance
  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const { data, error } = await balanceApi.getBalance();
      if (error) throw new Error(error);
      return data; // Returns { USDC: 100.50 }
    },
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(depositAmount);
      // We only allow depositing numbers
      if(isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      const { data, error } = await balanceApi.deposit(amount);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast({
        title: 'Deposit Successful',
        description: `${depositAmount} USDC has been deposited.`,
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
   const handleInputChange = (value: string, setter: (v: string) => void) => {
    // Regex: Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleDeposit = () => {
    depositMutation.mutate();
  };

  const formatBalance = (value?: number) =>
    typeof value === "number" 
      ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value) 
      : "0.00";

      const usdcBalance = balanceData?.USDC || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header usdcBalance={usdcBalance}/>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your USDC collateral</p>
        </div>

        {/* Main Balance Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-full text-green-500">
              <CircleDollarSign className="h-8 w-8" />
            </div>
            <span className="text-lg font-medium text-muted-foreground">Available Balance</span>
          </div>
          
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-5xl font-bold tracking-tight">
              {isLoading ? "..." : formatBalance(balanceData?.USDC)}
            </span>
            <span className="text-xl text-muted-foreground font-medium">USDC</span>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ArrowUpRight className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Deposit Funds</h2>
          </div>
          
          <div className="flex gap-4 max-w-lg items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="text"
                inputMode='decimal'
                placeholder="100.00"
                value={depositAmount}
                // onChange={(e) => setDepositAmount(e.target.value)}
                onChange={(e)=>handleInputChange(e.target.value,setDepositAmount)}
                className="bg-background text-lg h-12"
              />
            </div>

            <Button
              onClick={handleDeposit}
              disabled={depositMutation.isPending || !depositAmount}
              className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {depositMutation.isPending ? 'Processing...' : 'Deposit USDC'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            * This is a simulated environment. Deposits are instant for testing.
          </p>
        </div>
      </main>
    </div>
  );
}