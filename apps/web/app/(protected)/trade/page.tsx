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
} from "@/lib/api";
// import { useBackpackTicker } from '@/hooks/useBackpackTicker';

import {
  getMarketDetails,
  normalizeSymbol,
  toCamelCaseSymbol,
} from "@/lib/utils";
import { useMarketFeed } from "@/hooks/useMarketFeed";

export default function Trade() {
  const [selectedPair, setSelectedPair] = useState("BTC_USDC");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<CandleInterval>("1h");
    const [closingOrderId, setClosingOrderId] = useState<string | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ticker } = useMarketFeed(selectedPair);
  const currentPrice = ticker?.lastPrice ?? null;

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
    refetchInterval: 1000,
  });

  // Fetch balance
  const { data: rawBalanceData } = useQuery({
    queryKey: ["balance"],
    queryFn: async () => {
      const response = await balanceApi.getBalance();
      // Backend returns: { userAllWallet: [{ symbol: "USDC", balanceRaw: "...", ... }] }
      return (response.data as any)?.userAllWallet || [];
    },
    refetchInterval: 10000,
  });

  // 3. Helper to get specific coin balance (USDC, BTC, etc)
  // const getBalanceForSymbol = (symbol: string) => {
  //   if (!Array.isArray(rawBalanceData)) return 0;

  //   const wallet = rawBalanceData.find((w) => w.symbol === symbol);
  //   if (!wallet) return 0;

  //   return formatTokenAmount(wallet.balanceRaw, wallet.balanceDecimal);
  // };

  const { base} = getMarketDetails(selectedPair);
  console.log(base);

  // const quoteBalance = getBalanceForSymbol(base??"USDC") // This is usually USDC

  const { data: symbolWallet } = useQuery({
    queryKey: ["symbolBalance", base],
    queryFn: async () => {
      const { data } = await balanceApi.getBalanceBySymbol(base?? "USDC");
      return data?.wallet;
    },
    enabled: !!base,
    refetchInterval: 5000,
  });
  const quoteBalance = symbolWallet
    ? Number(symbolWallet.balanceRaw) / 10 ** symbolWallet.balanceDecimal
    : 0;

  // Fetch open orders
  //order by Id
  const { data: openOrdersData } = useQuery({
    queryKey: ["openOrders"],
    queryFn: async () => {
      const response = await orderApi.getOpenOrders();
      if (response.error) throw new Error(response.error);

      // FIX IS HERE: Extract 'allOrder' from the backend response object
      // Backend sends: { message: "success", allOrder: [...] }
      const rawData = response.data as any;
      return rawData?.allOrder || [];
    },
    refetchInterval: 10000,
  });

  // Fetch all orders
  const { data: allOrdersData } = useQuery({
    queryKey: ["allOrders"],
    queryFn: async () => {
      const response = await orderApi.getAllOrders();
      if (response.error) throw new Error(response.error);

      // FIX IS HERE: Extract 'allOrder' here too
      const rawData = response.data as any;
      return rawData?.allOrder || [];
    },
  });

  //fetch all open orders
  const { data: openOrders = [] } = useQuery({
    queryKey: ['openOrders'],
    queryFn: async () => {
      const response = await orderApi.getOpenOrders();
      const rawData = response.data as any;
      return rawData?.allOrder || [];
    },
    refetchInterval: 5000,
  });

  
  // Create order mutation
  const createOrderMutation = useMutation({
      mutationFn: async (order: CreateOrderRequest) => {
        const res = await orderApi.create(order);

        if (res.error || !res) {
          throw new Error(res.error || 'Order creation failed');
        }

        return res;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      toast({
        title: "Order Placed",
        description: "Your order has been successfully placed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  let orderSymbol=normalizeSymbol(selectedPair)

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
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      toast({
        title: "Position Closed",
        description: "Your position has been closed.",
      });
      setClosingOrderId(undefined);
    },
    onError: (error) => {
      toast({
        title: "Close Failed",
        description: error.message,
        variant: "destructive",
      });
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
      <Header quoteSymbol={base?? "BTC"} quoteBalance={quoteBalance} />

      <main className="flex-1 p-2 space-y-4">
        <MarketSelector
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          ticker={ticker}
          // priceChange24h={priceChange24h}
          onPairChange={setSelectedPair}
          onTimeframeChange={setSelectedTimeframe}
        />

        <div className="grid grid-cols-2 lg:grid-cols-12 gap-2 ">
          {/* Chart Section */}
          <div className="lg:col-span-6 h-[600px]">
            <TradingChart candles={candlesData} isLoading={isCandlesLoading} />
          </div>

          <div className="lg:col-span-3 h-[600px]">
            {currentPrice !== null && (
              <OrderBook symbol={selectedPair} currentPrice={currentPrice} />
            )}
          </div>

          {/* Order Form Section */}
          <div className="lg:col-span-3 h-[600px]">
            {currentPrice !== null && (
              <OrderForm
                symbol={orderSymbol}
                currentPrice={currentPrice}
                relevantBalance={quoteBalance}
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
                orders={openOrdersData ?? []}
                onClose={async (orderId) => {
                  await closeOrderMutation.mutateAsync(orderId);
                }}
                isClosing={closingOrderId}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <OrderHistoryTable orders={allOrdersData ?? []} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
