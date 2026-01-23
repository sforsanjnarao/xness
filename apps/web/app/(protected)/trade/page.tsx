"use client";

import { JSX, useState } from "react";
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
import {
  toCamelCaseSymbol,
} from "@/lib/utils";
import { useMarketFeed } from "@/hooks/useMarketFeed";

export default function Trade(): JSX.Element {
  const [selectedPair, setSelectedPair] = useState<Market>("BTC_USDC");
  const [selectedTimeframe, setSelectedTimeframe] = useState<CandleInterval>("1h");
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
    refetchInterval: 4000,
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
    refetchInterval: 2000,
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (order: CreateOrderRequest) => {
      const res = await orderApi.create(order);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      toast({ title: "Order Placed", description: "Successfully placed order" });
    },
    onError: (error) => {
      toast({ title: "Order Failed", description: error.message, variant: "destructive" });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      toast({ title: "Position Closed", description: "Position closed successfully" });
      setClosingOrderId(undefined);
    },
    onError: (error) => {
      toast({ title: "Close Failed", description: error.message, variant: "destructive" });
      setClosingOrderId(undefined);
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header usdcBalance={usdcBalance} />

      <main className="flex-1 p-2 md:p-4 space-y-4 max-w-[1920px] mx-auto w-full">
        
        {/* Market Selector - Full width */}
        <MarketSelector
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          ticker={ticker}
          onPairChange={(val)=>setSelectedPair(val as Market)}
          onTimeframeChange={setSelectedTimeframe}
        />

        {/* Main Grid: Flex-col on mobile, Grid on desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4">
          
          {/* 1. Chart Section - Full width mobile, 6 cols desktop */}
          <div className="order-1 lg:col-span-6 h-[400px] md:h-[500px] lg:h-[600px]">
            <TradingChart candles={candlesData} isLoading={isCandlesLoading} />
          </div>

          {/* 2. Order Form - Below chart on mobile, right side desktop */}
          <div className="order-2 lg:order-3 lg:col-span-3 h-auto lg:h-[600px]">
            {currentPrice !== null && (
              <OrderForm
                market={selectedPair}
                currentPrice={currentPrice}
                usdcBalance={usdcBalance}
                onSubmit={async (order) => {
                  await createOrderMutation.mutateAsync(order);
                }}
                isSubmitting={createOrderMutation.isPending}
              />
            )}
          </div>

          {/* 3. Order Book - Last on mobile (or middle desktop) */}
          <div className="order-3 lg:order-2 lg:col-span-3 h-[400px] md:h-[500px] lg:h-[600px]">
            {currentPrice > 0 && (
              <OrderBook symbol={selectedPair} currentPrice={currentPrice} />
            )}
          </div>
        </div>

        {/* Positions & History */}
        <div className="bg-card border border-border rounded-lg p-2 md:p-4">
          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="bg-secondary w-full justify-start overflow-x-auto">
              <TabsTrigger value="positions" className="flex-1 md:flex-none">Open Positions</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 md:flex-none">Order History</TabsTrigger>
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