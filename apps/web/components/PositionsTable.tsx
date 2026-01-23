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
import { JSX } from "react";

// Helper to convert Engine BigInt (string) to Number
const fromEngine = (val: string | null | undefined) => {
  if (!val) return 0;
  return Number(val) / 100_000_000; // 10^8
};
const renderOptionalPrice = (val?: string | null) => {
  if (val == null) {
    return <span className="text-muted-foreground font-mono" title="Not set">--</span>;
  }
  return `$${fromEngine(val).toFixed(2)}`;
};

interface PositionsTableProps {
  orders: Order[];
  onClose: (id: string) => void;
  isClosing?: string;
  currentPrices?: Record<string, number>;
}

export function PositionsTable({ orders, onClose, isClosing, currentPrices }: PositionsTableProps):JSX.Element {
  
  const calculateUnrealizedPnL = (order: Order) => {
    if(order.Pnl) return fromEngine(order.Pnl); 
    
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
    <div className="rounded-md border border-border overflow-hidden">
        {/* Responsive Scroll Wrapper */}
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className="whitespace-nowrap">
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Entry Price</TableHead>
                <TableHead className="text-right">Lev</TableHead>
                <TableHead className="text-right">TL</TableHead>
                <TableHead className="text-right">SP</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                    No open positions
                    </TableCell>
                </TableRow>
                ) : (
                orders.map((order) => {
                    const pnl = calculateUnrealizedPnL(order);
                    const isProfit = pnl >= 0;

                    return (
                    <TableRow key={order.id} className="whitespace-nowrap">
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
                        {renderOptionalPrice(order.takeProfitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                        {renderOptionalPrice(order.stopLossPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                        {fromEngine(order.initialMargin).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
                        {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => onClose(order.id)}
                            disabled={isClosing === order.id}
                        >
                            {isClosing === order.id ? "..." : "X"}
                        </Button>
                        </TableCell>
                    </TableRow>
                    );
                })
                )}
            </TableBody>
            </Table>
        </div>
    </div>
  );
}