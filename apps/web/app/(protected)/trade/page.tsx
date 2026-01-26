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
import { Button } from "@/components/ui/button";
import {
  balanceApi,
  candlesApi,
  orderApi,
  CreateOrderRequest,
  CandleInterval,
  Market,
  OrderSide,
} from "@/lib/api";
import {
  toCamelCaseSymbol,
} from "@/lib/utils";
import { useMarketFeed } from "@/hooks/useMarketFeed";
import { X } from "lucide-react";

export default function Trade(): JSX.Element {
  const [selectedPair, setSelectedPair] = useState<Market>("BTC_USDC");
  const [selectedTimeframe, setSelectedTimeframe] = useState<CandleInterval>("1h");
  const [closingOrderId, setClosingOrderId] = useState<string | undefined>();
  
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerSide, setDrawerSide] = useState<OrderSide>('LONG');

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

  const openMobileOrderForm = (side: OrderSide) => {
    setDrawerSide(side);
    setIsDrawerOpen(true);
  };


return (
    <div className="min-h-screen bg-background flex flex-col pb-[80px] lg:pb-0"> 
      {/* Added pb-[80px] to body so content isn't hidden behind sticky footer */}
      
      <Header usdcBalance={usdcBalance} />

      <main className="flex-1 p-2 md:p-4 space-y-4 max-w-[1920px] mx-auto w-full">
        
        <MarketSelector
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          ticker={ticker}
          onPairChange={(val)=>setSelectedPair(val as Market)}
          onTimeframeChange={setSelectedTimeframe}
        />

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4">
          {/* Chart Section */}
          <div className="lg:col-span-6 h-[400px] md:h-[500px] lg:h-[600px]">
            <TradingChart candles={candlesData} isLoading={isCandlesLoading} />
          </div>


           {/* Order Book */}
          <div className="lg:col-span-3 h-[400px] md:h-[500px] lg:h-[600px]">
            {currentPrice > 0 && (
              <OrderBook symbol={selectedPair} />
            )}
          </div>

          {/* 
            DESKTOP ONLY: Order Form 
            Hidden on mobile (lg:block, hidden)
          */}
          <div className="hidden lg:block lg:col-span-3 h-[600px]">
            {currentPrice !== null && (
              <OrderForm
                market={selectedPair}
                currentPrice={currentPrice}
                usdcBalance={usdcBalance}
                onSubmit={async (order) => { await createOrderMutation.mutateAsync(order); }}
                isSubmitting={createOrderMutation.isPending}
              />
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
                onClose={async (orderId) => await closeOrderMutation.mutateAsync(orderId)}
                isClosing={closingOrderId}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <OrderHistoryTable orders={allOrders} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/*MOBILE STICKY FOOTER*/}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 lg:hidden flex gap-3 pb-8 md:pb-4">
        <Button 
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold h-12 text-lg"
            onClick={() => openMobileOrderForm('LONG')}
        >
            Buy
        </Button>
        <Button 
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-12 text-lg"
            onClick={() => openMobileOrderForm('SHORT')}
        >
            Sell
        </Button>
      </div>

      {/* MOBILE DRAWER (BOTTOM SHEET)*/}
      {isDrawerOpen && (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* Drawer Content */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[51] rounded-t-2xl p-4 lg:hidden animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Place Order</h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                {currentPrice !== null && (
                    <OrderForm
                        market={selectedPair}
                        currentPrice={currentPrice}
                        usdcBalance={usdcBalance}
                        defaultSide={drawerSide} // Pass the side clicked
                        onSubmit={async (order) => { await createOrderMutation.mutateAsync(order); }}
                        isSubmitting={createOrderMutation.isPending}
                    />
                )}
            </div>
        </>
      )}
    </div>
  );
}