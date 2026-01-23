'use client'
import { useState, useEffect, JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CreateOrderRequest, Market, OrderSide } from '@/lib/api';
import { cn, getMarketDetails } from '@/lib/utils';
import { Wallet } from 'lucide-react';

interface OrderFormProps {
  market: Market      
  currentPrice: number;
  usdcBalance: number; // This is strictly USDC
  onSubmit: (order: CreateOrderRequest) => Promise<void>;
  isSubmitting?: boolean;
  defaultSide?: OrderSide; // Optional: pre-select Long/Short (for mobile drawer)
}

export function OrderForm({ 
  market, 
  currentPrice, 
  usdcBalance, 
  onSubmit, 
  isSubmitting,
  defaultSide = 'LONG' 
}: OrderFormProps):JSX.Element {
  const [side, setSide] = useState<OrderSide>(defaultSide);
  
  // Inputs
  const [quantityStr, setQuantityStr] = useState('');
  const [leverage, setLeverage] = useState<number>(1);
  const [takeProfitStr, setTakeProfitStr] = useState('');
  const [stopLossStr, setStopLossStr] = useState('');

  // Helper: "BTC_USDC" -> base: "BTC", quote: "USDC"
  const { base, quote } = getMarketDetails(market);

  // Calculations
  const quantity = parseFloat(quantityStr) || 0;
  
  // Formula: (Size * Price) / Leverage = Margin Used (in USDC)
  const marginRequired = currentPrice > 0 ? (quantity * currentPrice) / leverage : 0;
  
  const isValidOrder = quantity > 0 && marginRequired <= usdcBalance;

  // Handle Input (Allow decimals)
  const handleInputChange = (value: string, setter: (v: string) => void) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // Percentage Handler (Calculate Max BTC buyable with current USDC)
  const handlePercentage = (pct: number) => {
    if (!currentPrice) return;
    // Max Notional = Balance * Leverage
    // Max Qty = Max Notional / Price
    const maxQty = (usdcBalance * leverage) / currentPrice;
    
    // Round to 4 decimals to be safe
    const newQty = Math.floor((maxQty * pct) * 10000) / 10000;
    setQuantityStr(newQty.toString());
  };
  
  const handleSubmit = async () => {
    if (!isValidOrder) return;
    
    await onSubmit({
      market, 
      side,
      quantity, // Sending Asset Quantity (e.g. 0.1 BTC)
      leverage,
      takeProfit: takeProfitStr ? parseFloat(takeProfitStr) : null,
      stopLoss: stopLossStr ? parseFloat(stopLossStr) : null,
    });
    
    // Reset
    setQuantityStr('');
    setTakeProfitStr('');
    setStopLossStr('');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-5 h-full flex flex-col">
      {/* 1. Side Selector */}
      <div className="grid grid-cols-2 gap-2 bg-secondary/20 p-1 rounded-lg">
        <Button
          variant="ghost"
          onClick={() => setSide('LONG')}
          className={cn(
            'w-full font-bold transition-all',
            side === 'LONG' 
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Buy / Long
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSide('SHORT')}
          className={cn(
            'w-full font-bold transition-all',
            side === 'SHORT' 
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sell / Short
        </Button>
      </div>

      <div className="flex-1 space-y-5">
        {/* 2. Balance Display (FIXED: Shows Quote/USDC, not Base) */}
        <div className="flex justify-between text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
          <span>Available Margin</span>
          <div className="flex items-center gap-1 text-foreground font-mono font-medium">
             <Wallet className="w-3 h-3" />
             {usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quote}
          </div>
        </div>

        {/* 3. Quantity Input */}
        <div className="space-y-2">
          <Label className="text-s">Order Size ({base})</Label>
          {/* <Label className="text-s">Order Size</Label> */}

          <div className="relative">
            <Input
              type="text" 
              inputMode="decimal"
              placeholder="0.00"
              value={quantityStr}
              onChange={(e) => handleInputChange(e.target.value, setQuantityStr)}
              className="pr-12 font-mono"
            />
            <div className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">
              {/* {base} */} lots
            </div>
          </div>
          {/* <div className="grid grid-cols-4 gap-2"> */}
            {/* {[0.25, 0.5, 0.75, 1].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => handlePercentage(pct)}
                className="text-[10px] h-6 border-dashed"
              >
                {pct * 100}%
              </Button>
            ))} */}
          {/* </div> */}
        </div>

        {/* 4. Leverage */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Leverage</Label>
            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
              {leverage}x
            </span>
          </div>
          <Slider
            value={[leverage]}
            onValueChange={(v) => setLeverage(v[0] ?? 1)}
            min={1}
            max={20}
            step={1}
            className="cursor-pointer"
          />
        </div>

        {/* 5. TP / SL */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Take Profit</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Price"
              value={takeProfitStr}
              onChange={(e) => handleInputChange(e.target.value, setTakeProfitStr)}
              className="h-10 text-s font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Stop Loss</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Price"
              value={stopLossStr}
              onChange={(e) => handleInputChange(e.target.value, setStopLossStr)}
              className="h-10 text-s font-mono"
            />
          </div>
        </div>
      </div>

      {/* 6. Footer / Summary */}
      <div className="space-y-3 pt-4 border-t border-border mt-auto">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Margin Required</span>
          <span className="font-mono font-medium">
            {marginRequired.toFixed(2)} {quote}
          </span>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!isValidOrder || isSubmitting}
          className={cn(
            'w-full py-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98]',
            !isValidOrder ? "opacity-50 cursor-not-allowed" :
            side === 'LONG' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
          )}
        >
          {isSubmitting ? 'Processing...' : (
            <>
              {side === 'LONG' ? 'Buy' : 'Sell'} {base}
            </>
          )}
        </Button>
        
        {quantity > 0 && marginRequired > usdcBalance && (
          <p className="text-center text-[10px] text-red-500 font-medium">
            Insufficient Balance
          </p>
        )}
      </div>
    </div>
  );
}