import { Order } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { JSX } from 'react';

interface OrderHistoryTableProps {
  orders: Order[];
}

const ENGINE_SCALE = 100_000_000;

const fromEngine = (val: string | null | undefined) => {
  if (!val) return 0;
  return Number(val) / ENGINE_SCALE;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val);
};

export function OrderHistoryTable({ orders }: OrderHistoryTableProps):JSX.Element {
  const closedOrders = orders
                        .filter(order => order.status === 'CLOSED')
                        .sort((a,b)=>{
                          const t1 = new Date(a.closedAt ?? 0).getTime();
                          const t2 = new Date(b.closedAt ?? 0).getTime();
                          return t2 - t1;
                        })

  if (closedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground border border-dashed rounded-lg text-sm">
        No order history found
      </div>
    );
  }

  const ReasonBadge = ({ reason }: { reason: string | null }) => {
    if (!reason) return <span>-</span>;
    switch (reason) {
      case 'take_profit': return <Badge className="border-green-500 text-green-500 bg-green-500/10 h-5 px-1.5" variant="outline">TP</Badge>;
      case 'stop_loss': return <Badge className="border-red-500 text-red-500 bg-red-500/10 h-5 px-1.5" variant="outline">SL</Badge>;
      case 'liquidation': return <Badge variant="destructive" className="h-5 px-1.5">LIQ</Badge>;
      case 'manual': default: return <Badge variant="secondary" className="text-muted-foreground h-5 px-1.5">M</Badge>;
    }
  };

  return (
    <div className="rounded-md border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-muted-foreground border-b border-border whitespace-nowrap">
              <th className="text-left py-2 px-4 font-medium">Market</th>
              <th className="text-left py-2 px-4 font-medium">Side</th>
              <th className="text-right py-2 px-4 font-medium">Size</th>
              <th className="text-right py-2 px-4 font-medium">Entry</th>
              <th className="text-right py-2 px-4 font-medium">Close</th>
              <th className="text-right py-2 px-4 font-medium">PnL</th>
              <th className="text-right py-2 px-4 font-medium">Reason</th>
              <th className="text-right py-2 px-4 font-medium">Time</th>
            </tr>
          </thead>

          <tbody>
            {closedOrders.map((order) => {
              const pnl = fromEngine(order.Pnl);
              const isProfit = pnl >= 0;
              const marketName = order.market.split('_')[0]; 

              return (   
                <tr key={order.id} className="border-b border-border hover:bg-secondary/20 transition-colors whitespace-nowrap">
                  <td className="py-2 px-4 font-medium">
                    {marketName}
                  </td>

                  <td className="py-2 px-4">
                    <span className={cn(
                        'text-xs font-bold uppercase',
                        order.side === 'LONG' ? 'text-green-500' : 'text-red-500'
                    )}>
                        {order.side} <span className="text-muted-foreground opacity-70 ml-1">{order.leverage}x</span>
                    </span>
                  </td>

                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {fromEngine(order.quantity).toFixed(4)}
                  </td>

                  <td className="py-2 px-4 text-right font-mono text-muted-foreground text-xs">
                    {formatCurrency(fromEngine(order.openPrice))}
                  </td>

                  <td className="py-2 px-4 text-right font-mono text-muted-foreground text-xs">
                    {formatCurrency(fromEngine(order.closePrice))}
                  </td>

                  <td
                    className={cn(
                      'py-2 px-4 text-right font-mono font-medium',
                      isProfit ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {isProfit ? '+' : ''}
                    {pnl.toFixed(2)}
                  </td>

                  <td className="py-2 px-4 text-right">
                    <ReasonBadge reason={order.reason} />
                  </td>

                  <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">
                    {order.closedAt ? new Date(order.closedAt).toLocaleTimeString() : '-'}
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