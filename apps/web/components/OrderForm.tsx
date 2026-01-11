'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CreateOrderRequest, OrderSide } from '@/lib/api';
import { cn, getMarketDetails } from '@/lib/utils';
import { Wallet } from 'lucide-react';

interface OrderFormProps {
  symbol: string;      
  currentPrice: number;
  relevantBalance: number; 
  onSubmit: (order: CreateOrderRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function OrderForm({ 
  symbol, 
  currentPrice, 
  relevantBalance, 
  onSubmit, 
  isSubmitting 
}: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('LONG');
  
  // STRING STATE for all inputs to prevent typing bugs
  const [quantityStr, setQuantityStr] = useState('');
  const [leverage, setLeverage] = useState<number>(1);
  const [takeProfitStr, setTakeProfitStr] = useState(''); // Restored
  const [stopLossStr, setStopLossStr] = useState('');     // Restored

  const { base, quote } = getMarketDetails(symbol);

  const quantity = parseFloat(quantityStr) || 0;
  const marginRequired = (quantity * currentPrice) / leverage;
  const isValidOrder = quantity > 0 && marginRequired <= relevantBalance;

  // Safe Input Handler
  const handleInputChange = (value: string, setter: (v: string) => void) => {
    // Regex: Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handlePercentage = (pct: number) => {
    if (!currentPrice) return;
    const maxQty = (relevantBalance * leverage) / currentPrice;
    setQuantityStr((maxQty * pct).toFixed(6));
  };
  
  const handleSubmit = async () => {
    if (!isValidOrder) return;
    await onSubmit({
      symbol, // Backend might expect "BTC_USDC" or "BTCUSDC" depending on your engine
      side,
      quantity,
      leverage,
      // Convert strings to numbers for submission
      takeProfit: takeProfitStr ? parseFloat(takeProfitStr) : undefined,
      stopLoss: stopLossStr ? parseFloat(stopLossStr) : undefined,
    });
    // Reset fields
    setQuantityStr('');
    setTakeProfitStr('');
    setStopLossStr('');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-5">
      {/* 1. Side Selector */}
      <div className="grid grid-cols-2 gap-2 bg-secondary/20 p-1 rounded-lg">
        <Button
          variant="ghost"
          onClick={() => setSide('LONG')}
          className={cn(
            'w-full font-bold',
            side === 'LONG' ? 'bg-green-500 text-white hover:bg-green-600' : 'text-muted-foreground'
          )}
        >
          Buy / Long
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSide('SHORT')}
          className={cn(
            'w-full font-bold',
            side === 'SHORT' ? 'bg-red-500 text-white hover:bg-red-600' : 'text-muted-foreground'
          )}
        >
          Sell / Short
        </Button>
      </div>

      {/* 2. Balance Display */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Avail. to Trade</span>
        <div className="flex items-center gap-1 text-foreground font-mono">
           <Wallet className="w-3 h-3" />
           {relevantBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {base}
        </div>
      </div>

      {/* 3. Quantity Input */}
      <div className="space-y-2">
        <Label>Size ({base})</Label>
        <div className="relative">
          <Input
            type="text" 
            inputMode="decimal"
            placeholder="0.00"
            value={quantityStr}
            onChange={(e) => handleInputChange(e.target.value, setQuantityStr)}
            className="pr-12 font-mono"
          />
          <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">
            {base}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <Button
              key={pct}
              variant="secondary"
              size="sm"
              onClick={() => handlePercentage(pct)}
              className="text-xs h-7"
            >
              {pct * 100}%
            </Button>
          ))}
        </div>
      </div>

      {/* 4. Leverage */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label>Leverage</Label>
          <span className="text-sm font-mono bg-secondary px-2 rounded">{leverage}x</span>
        </div>
        <Slider
          value={[leverage]}
          onValueChange={(v) => setLeverage(v[0] ?? 1)}
          min={1}
          max={20}
          step={1}
        />
      </div>

      {/* 5. TP / SL (RESTORED) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Take Profit</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Price"
            value={takeProfitStr}
            onChange={(e) => handleInputChange(e.target.value, setTakeProfitStr)}
            className="bg-secondary border-border text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Stop Loss</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Price"
            value={stopLossStr}
            onChange={(e) => handleInputChange(e.target.value, setStopLossStr)}
            className="bg-secondary border-border text-sm font-mono"
          />
        </div>
      </div>

      {/* 6. Cost Summary */}
      <div className="space-y-1 pt-2 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Margin Cost</span>
          <span className="font-mono">{marginRequired.toFixed(2)} {quote}</span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValidOrder || isSubmitting}
        className={cn(
          'w-full py-6 text-lg font-bold',
          side === 'LONG' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
        )}
      >
        {side === 'LONG' ? 'Buy' : 'Sell'} {base}
      </Button>
    </div>
  );
}