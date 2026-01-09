'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CreateOrderRequest, OrderSide, Balance } from '@/lib/api';
import { cn } from '@/lib/utils';

interface OrderFormProps {
  symbol: string;
  currentPrice: number;
  balance?: Balance;
  onSubmit: (order: CreateOrderRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function OrderForm({ symbol, currentPrice, balance, onSubmit, isSubmitting }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('LONG');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const availableBalance = balance?.USDC ?? 0;
  const margin = quantity ? (parseFloat(quantity) * currentPrice) / leverage : 0;
  const isValidOrder = quantity && parseFloat(quantity) > 0 && margin <= availableBalance;

  const handleQuantityPercentage = (percentage: number) => {
    const maxQuantity = (availableBalance * leverage) / currentPrice;
    setQuantity((maxQuantity * percentage).toFixed(6));
  };

  const handleSubmit = async () => {
    if (!isValidOrder) return;

    await onSubmit({
      symbol,
      side,
      quantity: parseFloat(quantity),
      leverage,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    });

    // Reset form
    setQuantity('');
    setTakeProfit('');
    setStopLoss('');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={side === 'LONG' ? 'default' : 'outline'}
          onClick={() => setSide('LONG')}
          className={cn(
            'w-full',
            side === 'LONG' && 'bg-success hover:bg-success/90 text-success-foreground'
          )}
        >
          Long
        </Button>
        <Button
          variant={side === 'SHORT' ? 'default' : 'outline'}
          onClick={() => setSide('SHORT')}
          className={cn(
            'w-full',
            side === 'SHORT' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          Short
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="bg-secondary border-border"
        />
        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <Button
              key={pct}
              variant="outline"
              size="sm"
              onClick={() => handleQuantityPercentage(pct)}
              className="text-xs"
            >
              {pct * 100}%
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Leverage</Label>
          <span className="text-sm text-primary font-medium">{leverage}x</span>
        </div>
        <Slider
          value={[leverage]}
          onValueChange={(value) => setLeverage(value[0])}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>10x</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Take Profit</Label>
          <Input
            type="number"
            placeholder="Optional"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="bg-secondary border-border text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Stop Loss</Label>
          <Input
            type="number"
            placeholder="Optional"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="bg-secondary border-border text-sm"
          />
        </div>
      </div>

      <div className="space-y-1 text-sm border-t border-border pt-3">
        <div className="flex justify-between text-muted-foreground">
          <span>Available</span>
          <span>{availableBalance.toLocaleString()} USDC</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Margin Required</span>
          <span>{margin.toFixed(2)} USDC</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Entry Price</span>
          <span>${currentPrice.toLocaleString()}</span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValidOrder || isSubmitting}
        className={cn(
          'w-full',
          side === 'LONG' 
            ? 'bg-success hover:bg-success/90' 
            : 'bg-destructive hover:bg-destructive/90'
        )}
      >
        {isSubmitting ? 'Placing Order...' : `Place ${side} Order`}
      </Button>
    </div>
  );
}
