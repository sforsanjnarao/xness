import { Order } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderHistoryTableProps {
  orders: Order[];
}

const formatQty = (qty: string, decimals: number) =>
  Number(qty) / Math.pow(10, decimals);

const formatPrice = (raw: number | null, decimals: number) =>
  raw == null ? '-' : (raw / Math.pow(10, decimals)).toLocaleString();

const normalizeSymbol = (symbol: string) =>
  symbol.includes('_') ? symbol.split('_')[0] : symbol.replace('USDC', '');

export function OrderHistoryTable({ orders }: OrderHistoryTableProps) {
  const closedOrders = orders.filter(order => order.status === 'CLOSED');

  if (closedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No order history
      </div>
    );
  }

  const reasonBadge = (reason: string | null) => {
    if (reason === 'TP') return <Badge className="border-success text-success text-xs" variant="outline">TP</Badge>;
    if (reason === 'SL') return <Badge className="border-destructive text-destructive text-xs" variant="outline">SL</Badge>;
    if (reason === 'LIQUIDATION') return <Badge variant="destructive" className="text-xs">Liquidated</Badge>;
    return <Badge variant="outline" className="text-xs">Manual</Badge>;
  };

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
            <th className="text-right py-3 px-2 font-medium">Reason</th>
            <th className="text-right py-3 px-2 font-medium">Closed</th>
          </tr>
        </thead>

        <tbody>
          {closedOrders.map(order => {
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

                <td className="py-3 px-2 text-right">
                  {reasonBadge(order.reason)}
                </td>

                <td className="py-3 px-2 text-right text-muted-foreground">
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
  );
}