
import { Order } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderHistoryTableProps {
  orders: Order[];
}

export function OrderHistoryTable({ orders }: OrderHistoryTableProps) {
  const closedOrders = orders.filter((order) => order.status === 'CLOSED');

  if (closedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No order history
      </div>
    );
  }

  const getCloseReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'TP':
        return <Badge variant="outline" className="border-success text-success text-xs">Take Profit</Badge>;
      case 'SL':
        return <Badge variant="outline" className="border-destructive text-destructive text-xs">Stop Loss</Badge>;
      case 'LIQUIDATION':
        return <Badge variant="destructive" className="text-xs">Liquidated</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Manual</Badge>;
    }
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
            <th className="text-right py-3 px-2 font-medium">Close Reason</th>
            <th className="text-right py-3 px-2 font-medium">Closed At</th>
          </tr>
        </thead>
        <tbody>
          {closedOrders.map((order) => {
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
                <td className={cn('py-3 px-2 text-right font-medium', isProfitable ? 'text-long' : 'text-short')}>
                  {isProfitable ? '+' : ''}{pnl.toFixed(2)} USDC
                </td>
                <td className="py-3 px-2 text-right">
                  {getCloseReasonBadge(order.closeReason)}
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground">
                  {order.closedAt ? new Date(order.closedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
