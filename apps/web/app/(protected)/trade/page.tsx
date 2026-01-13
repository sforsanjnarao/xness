"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { TradingChart } from "@/components/TradingChart";
import { OrderForm } from "@/components/OrderForm";
import { PositionsTable } from "@/components/PositionsTable";
import { OrderHistoryTable } from "@/components/OrderHistoryTable";
import { MarketSelector } from "@/components/MarketSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { OrderBook } from "@/components/OrderBook";
import {
  balanceApi,
  candlesApi,
  orderApi,
  CreateOrderRequest,
  CandleInterval,
  Market,
} from "@/lib/api";
// import { useBackpackTicker } from '@/hooks/useBackpackTicker';

import {
  getMarketDetails,
  normalizeSymbol,
  toCamelCaseSymbol,
} from "@/lib/utils";
import { useMarketFeed } from "@/hooks/useMarketFeed";

export default function Trade() {
  const [selectedPair, setSelectedPair] = useState<Market>("BTC_USDC");
  const [selectedTimeframe, setSelectedTimeframe] =useState<CandleInterval>("1h");
  const [closingOrderId, setClosingOrderId] = useState<string | undefined>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { ticker } = useMarketFeed(selectedPair);
  const currentPrice = ticker?.lastPrice ?? 0;

  // Fetch candles
  const { data: candlesData = [], isLoading: isCandlesLoading } = useQuery({
    queryKey: ["candles", selectedPair, selectedTimeframe],
    queryFn: async () => {
      const apiSymbol = toCamelCaseSymbol(selectedPair);
      const { data, error } = await candlesApi.getCandles(
        apiSymbol,
        selectedTimeframe
      );
      if (error || !data) throw new Error(error);

      return data.data;
    },
    refetchInterval: 60000,
  });

  // Fetch balance
  const { data: balanceData } = useQuery({
    queryKey: ["balance"],
    queryFn: async () => {
      const { data, error } = await balanceApi.getBalance();
      if (error) throw new Error(error);
      return data; 
    },
    refetchInterval: 5000,
  });

  

  // const { base} = getMarketDetails(selectedPair);
  // console.log(base);

  const usdcBalance = balanceData?.USDC || 0;


  // Fetch open orders
    const { data: openOrders = [] } = useQuery({
    queryKey: ["openOrders"],
    queryFn: async () => {
      const response = await orderApi.getOpenOrders();
      if (response.error) throw new Error(response.error);
      const rawData = response.data as any;
      return rawData?.allOrder || [];
    },
    refetchInterval: 2000, // Faster refresh for open positions
  });


  // Fetch all orders
  const { data: allOrders = [] } = useQuery({
    queryKey: ["allOrders"],
    queryFn: async () => {
      const response = await orderApi.getAllOrders();
      if (response.error) throw new Error(response.error);
      const rawData = response.data as any;
      return rawData?.allOrder || [];
    },
    refetchInterval: 3000,
  });


  // //fetch all open orders
  // const { data: openOrders = [] } = useQuery({
  //   queryKey: ['openOrders'],
  //   queryFn: async () => {
  //     const response = await orderApi.getOpenOrders();
  //     const rawData = response.data as any;
  //     return rawData?.allOrder || [];
  //   },
  //   refetchInterval: 5000,
  // });

  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (order: CreateOrderRequest) => {
      const res = await orderApi.create(order);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] }); // Update margin usage immediately
      toast({ title: "Order Placed", description: "Successfully placed order" });
    },
    onError: (error) => {
      toast({ title: "Order Failed", description: error.message, variant: "destructive" });
    },
  });

  // let orderSymbol=normalizeSymbol(selectedPair)

  // Close order mutation
  
  const closeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setClosingOrderId(orderId);
      const { data, error } = await orderApi.close(orderId);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] }); // PnL returns to balance
      toast({ title: "Position Closed", description: "Position closed successfully" });
      setClosingOrderId(undefined);
    },
    onError: (error) => {
      toast({ title: "Close Failed", description: error.message, variant: "destructive" });
      setClosingOrderId(undefined);
    },
  });


  // export function formatPrice(raw: number, decimals: number) {
  //   return raw / Math.pow(10, decimals);
  // }

  // export function formatQty(qty: string, decimals: number) {
  //   return Number(qty) / Math.pow(10, decimals);
  // }

  // Get current price from latest candle
  // const lastCandle = candlesData[candlesData.length - 1];
  //   const firstCandle = candlesData[0];

  //   const currentPrice = lastCandle ? lastCandle.close : 0;

  //   const priceChange24h = (lastCandle && firstCandle)
  //     ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
  //     : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header usdcBalance={usdcBalance} />

      <main className="flex-1 p-2 space-y-4">
        <MarketSelector
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          ticker={ticker}
          // priceChange24h={priceChange24h}
          onPairChange={(val)=>setSelectedPair(val as Market)}
          onTimeframeChange={setSelectedTimeframe}
        />

        <div className="grid grid-cols-2 lg:grid-cols-12 gap-2 ">
          {/* Chart Section */}
          <div className="lg:col-span-6 h-[600px]">
            <TradingChart candles={candlesData} isLoading={isCandlesLoading} />
          </div>

          {/* Order Book */}
          <div className="lg:col-span-3 h-[600px]">
            {currentPrice > 0 && (
              <OrderBook symbol={selectedPair} currentPrice={currentPrice} />
            )}
          </div>

          {/* Order Form Section */}
          <div className="lg:col-span-3 h-[600px]">
            {currentPrice !== null && (
              <OrderForm
                market={selectedPair}
                currentPrice={currentPrice}
                usdcBalance={usdcBalance} // Pass strict USDC balance
                onSubmit={async (order) => {
                  await createOrderMutation.mutateAsync(order);
                }}
                isSubmitting={createOrderMutation.isPending}
              />
            )}
          </div>
        </div>

        {/* Positions & History */}
        <div className="bg-card border border-border rounded-lg p-4">
          <Tabs defaultValue="positions">
            <TabsList className="bg-secondary">
              <TabsTrigger value="positions">Open Positions</TabsTrigger>
              <TabsTrigger value="history">Order History</TabsTrigger>
            </TabsList>
            <TabsContent value="positions" className="mt-4">
              <PositionsTable
                orders={openOrders}
                currentPrices={{ [selectedPair]: currentPrice }} 
                onClose={async (orderId) => {
                  await closeOrderMutation.mutateAsync(orderId);
                }}
                isClosing={closingOrderId}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <OrderHistoryTable orders={allOrders} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
