import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Order } from "@/lib/api";

// Helper to convert Engine BigInt (string) to Number
const fromEngine = (val: string | null | undefined) => {
  if (!val) return 0;
  return Number(val) / 100_000_000; // 10^8
};

interface PositionsTableProps {
  orders: Order[];
  onClose: (id: string) => void;
  isClosing?: string;
  currentPrices?: Record<string, number>;
}

export function PositionsTable({ orders, onClose, isClosing, currentPrices }: PositionsTableProps) {
  
  // Frontend PnL Calculation (Smoother than waiting for backend)
  const calculateUnrealizedPnL = (order: Order) => {
    if(order.Pnl) return fromEngine(order.Pnl); // Use backend PnL if available
    
    // Otherwise estimate locally
    const currentPrice = currentPrices?.[order.market];
    if(!currentPrice) return 0;

    const openPrice = fromEngine(order.openPrice);
    const qty = fromEngine(order.quantity);
    
    if (order.side === "LONG") {
      return (currentPrice - openPrice) * qty;
    } else {
      return (openPrice - currentPrice) * qty;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Entry Price</TableHead>
          <TableHead className="text-right">Leverage</TableHead>
          <TableHead className="text-right">Margin</TableHead>
          <TableHead className="text-right">PnL (u)</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
              No open positions
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => {
            const pnl = calculateUnrealizedPnL(order);
            const isProfit = pnl >= 0;

            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.market}</TableCell>
                <TableCell className={order.side === "LONG" ? "text-green-500" : "text-red-500"}>
                  {order.side}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fromEngine(order.quantity).toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${fromEngine(order.openPrice).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">{order.leverage}x</TableCell>
                <TableCell className="text-right font-mono">
                  {fromEngine(order.initialMargin).toFixed(2)} USDC
                </TableCell>
                <TableCell className={`text-right font-mono ${isProfit ? "text-green-500" : "text-red-500"}`}>
                  {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} USDC
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onClose(order.id)}
                    disabled={isClosing === order.id}
                  >
                    {isClosing === order.id ? "Closing..." : "Close"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}