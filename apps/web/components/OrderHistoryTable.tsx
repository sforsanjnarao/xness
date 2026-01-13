import { Order } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderHistoryTableProps {
  orders: Order[];
}

// 1. ENGINE CONSTANT (10^8)
const ENGINE_SCALE = 100_000_000;

// 2. Helper to convert Engine BigInt string to Number
const fromEngine = (val: string | null | undefined) => {
  if (!val) return 0;
  return Number(val) / ENGINE_SCALE;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(val);
};

export function OrderHistoryTable({ orders }: OrderHistoryTableProps) {
  // Filter only closed orders
  const closedOrders = orders.filter(order => order.status === 'CLOSED');

  if (closedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground border border-dashed rounded-lg">
        No order history found
      </div>
    );
  }

  // 3. Map Backend Enums to UI Badges
  // Backend Enum: 'manual' | 'take_profit' | 'stop_loss' | 'liquidation'
  const ReasonBadge = ({ reason }: { reason: string | null }) => {
    if (!reason) return <span>-</span>;

    switch (reason) {
      case 'take_profit':
        return <Badge className="border-green-500 text-green-500 bg-green-500/10 hover:bg-green-500/20" variant="outline">TP</Badge>;
      case 'stop_loss':
        return <Badge className="border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20" variant="outline">SL</Badge>;
      case 'liquidation':
        return <Badge variant="destructive">LIQ</Badge>;
      case 'manual':
      default:
        return <Badge variant="secondary" className="text-muted-foreground">Manual</Badge>;
    }
  };

  return (
    <div className="rounded-md border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-3 px-4 font-medium">Market</th>
              <th className="text-left py-3 px-4 font-medium">Side</th>
              <th className="text-right py-3 px-4 font-medium">Size</th>
              <th className="text-right py-3 px-4 font-medium">Entry Price</th>
              <th className="text-right py-3 px-4 font-medium">Close Price</th>
              <th className="text-right py-3 px-4 font-medium">Realized PnL</th>
              <th className="text-right py-3 px-4 font-medium">Reason</th>
              <th className="text-right py-3 px-4 font-medium">Time</th>
            </tr>
          </thead>

          <tbody>
            {closedOrders.map((order) => {
              // Convert BigInt strings to numbers
              const pnl = fromEngine(order.Pnl);
              const isProfit = pnl >= 0;
              const marketName = order.market.split('_')[0]; // "BTC_USDC" -> "BTC"

              return (
                <tr key={order.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {marketName} <span className="text-muted-foreground text-xs">/USDC</span>
                  </td>

                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-bold',
                        order.side === 'LONG'
                          ? 'border-green-500 text-green-500 bg-green-500/10'
                          : 'border-red-500 text-red-500 bg-red-500/10'
                      )}
                    >
                      {order.side} {order.leverage}x
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-right font-mono">
                    {fromEngine(order.quantity).toFixed(4)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(fromEngine(order.openPrice))}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(fromEngine(order.closePrice))}
                  </td>

                  <td
                    className={cn(
                      'py-3 px-4 text-right font-mono font-medium',
                      isProfit ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {isProfit ? '+' : ''}
                    {pnl.toFixed(2)} USDC
                  </td>

                  <td className="py-3 px-4 text-right">
                    <ReasonBadge reason={order.reason} />
                  </td>

                  <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                    {order.closedAt
                      ? new Date(order.closedAt).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}