'use client'
import { Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface PositionsTableProps {
  orders: Order[];
  onClose: (orderId: string) => Promise<void>;
  isClosing?: string;
}

export function PositionsTable({ orders, onClose, isClosing }: PositionsTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No open positions
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-3 px-2 font-medium">Symbol</th>
            <th className="text-left py-3 px-2 font-medium">Side</th>
            <th className="text-right py-3 px-2 font-medium">Size</th>
            <th className="text-right py-3 px-2 font-medium">Entry</th>
            <th className="text-right py-3 px-2 font-medium">Mark</th>
            <th className="text-right py-3 px-2 font-medium">PnL</th>
            <th className="text-right py-3 px-2 font-medium">TP/SL</th>
            <th className="text-right py-3 px-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const pnl = order.pnl ?? 0;
            const isProfitable = pnl >= 0;

            return (
              <tr key={order.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-3 px-2 font-medium">{order.symbol}</td>
                <td className="py-3 px-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      order.side === 'LONG'
                        ? 'border-success text-success'
                        : 'border-destructive text-destructive'
                    )}
                  >
                    {order.side}
                  </Badge>
                </td>
                <td className="py-3 px-2 text-right">{order.quantity}</td>
                <td className="py-3 px-2 text-right">${order.entryPrice.toLocaleString()}</td>
                <td className="py-3 px-2 text-right">
                  ${order.markPrice?.toLocaleString() ?? '-'}
                </td>
                <td className={cn('py-3 px-2 text-right font-medium', isProfitable ? 'text-long' : 'text-short')}>
                  {isProfitable ? '+' : ''}{pnl.toFixed(2)} USDC
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                  {order.takeProfit ? `TP: $${order.takeProfit}` : '-'} / {order.stopLoss ? `SL: $${order.stopLoss}` : '-'}
                </td>
                <td className="py-3 px-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onClose(order.id)}
                    disabled={isClosing === order.id}
                    className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
