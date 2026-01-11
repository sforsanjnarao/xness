'use client';

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

// Helpers
const formatQty = (qty: string, decimals: number) =>
  Number(qty) / Math.pow(10, decimals);

const formatPrice = (raw: number | null, decimals: number) =>
  raw == null ? '-' : (raw / Math.pow(10, decimals)).toLocaleString();

const normalizeSymbol = (symbol: string) =>
  symbol.includes('_') ? symbol.split('_')[0] : symbol.replace('USDC', '');

export function PositionsTable({ orders, onClose, isClosing }: PositionsTableProps) {
  const openOrders = orders.filter(o => o.status === 'OPEN');

  if (openOrders.length === 0) {
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
            <th className="text-right py-3 px-2 font-medium">PnL</th>
            <th className="text-right py-3 px-2 font-medium">TP / SL</th>
            <th className="text-right py-3 px-2 font-medium">Action</th>
          </tr>
        </thead>

        <tbody>
          {openOrders.map(order => {
            const pnl = order.Pnl ?? 0;
            const isProfit = pnl >= 0;

            return (
              <tr key={order.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-3 px-2 font-medium">
                  {normalizeSymbol(order.symbol)}
                </td>

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

                <td className="py-3 px-2 text-right">
                  {formatQty(order.quantity, order.quantityDecimal)}
                </td>

                <td className="py-3 px-2 text-right">
                  ${formatPrice(order.openPrice, order.priceDecimals)}
                </td>

                <td
                  className={cn(
                    'py-3 px-2 text-right font-medium',
                    isProfit ? 'text-long' : 'text-short'
                  )}
                >
                  {isProfit ? '+' : ''}
                  {pnl.toFixed(4)}
                </td>

                <td className="py-3 px-2 text-right text-xs text-muted-foreground">
                  {order.takeProfitPrice
                    ? `TP: $${formatPrice(order.takeProfitPrice, order.priceDecimals)}`
                    : '-'}
                  {' / '}
                  {order.stopLossPrice
                    ? `SL: $${formatPrice(order.stopLossPrice, order.priceDecimals)}`
                    : '-'}
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