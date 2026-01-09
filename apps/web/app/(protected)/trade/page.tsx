'use client'

import { useState} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { TradingChart } from '@/components/TradingChart';
import { OrderForm } from '@/components/OrderForm';
import { PositionsTable } from '@/components/PositionsTable';
import { OrderHistoryTable } from '@/components/OrderHistoryTable';
import { MarketSelector } from '@/components/MarketSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  balanceApi, 
  candlesApi, 
  orderApi, 
  CreateOrderRequest, 
  CandleInterval 
} from '@/lib/api';

export default function Trade() {
  const [selectedPair, setSelectedPair] = useState('BTC_USDC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<CandleInterval>('1h');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch balance
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const { data, error } = await balanceApi.getBalance();
      if (error) throw new Error(error);
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch candles
    const { data: candlesData = [], isLoading: isCandlesLoading } = useQuery({
    queryKey: ['candles', selectedPair, selectedTimeframe],
    queryFn: async () => {
      const { data, error } = await candlesApi.getCandles(selectedPair, selectedTimeframe);
      if (error || !data) throw new Error(error);
      

      return data.data; 
    },
    refetchInterval: 10000,
  });


  // Fetch open orders
  const { data: openOrdersData } = useQuery({
    queryKey: ['openOrders'],
    queryFn: async () => {
      const { data, error } = await orderApi.getOpenOrders();
      if (error) throw new Error(error);
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch all orders
  const { data: allOrdersData } = useQuery({
    queryKey: ['allOrders'],
    queryFn: async () => {
      const { data, error } = await orderApi.getAllOrders();
      if (error) throw new Error(error);
      return data;
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (order: CreateOrderRequest) => {
      const { data, error } = await orderApi.create(order);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast({
        title: 'Order Placed',
        description: 'Your order has been successfully placed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Order Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Close order mutation
  const [closingOrderId, setClosingOrderId] = useState<string | undefined>();
  const closeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setClosingOrderId(orderId);
      const { data, error } = await orderApi.close(orderId);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      toast({
        title: 'Position Closed',
        description: 'Your position has been closed.',
      });
      setClosingOrderId(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Close Failed',
        description: error.message,
        variant: 'destructive',
      });
      setClosingOrderId(undefined);
    },
  });
 
  // Get current price from latest candle
const lastCandle = candlesData[candlesData.length - 1];
  const firstCandle = candlesData[0];

  const currentPrice = lastCandle ? lastCandle.close : 0;

  const priceChange24h = (lastCandle && firstCandle)
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
    : 0;




  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header balance={balanceData} />
      
      <main className="flex-1 p-4 space-y-4">
        <MarketSelector
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          currentPrice={currentPrice}
          priceChange24h={priceChange24h}
          onPairChange={setSelectedPair}
          onTimeframeChange={setSelectedTimeframe}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart Section */}
          <div className="lg:col-span-3 h-[500px]">
            <TradingChart 
              candles={candlesData ?? []} 
              isLoading={isCandlesLoading} 
            />
          </div>

          {/* Order Form Section */}
          <div className="lg:col-span-1">
            <OrderForm
              symbol={selectedPair}
              currentPrice={currentPrice}
              balance={balanceData}
              onSubmit={async (order) => {
                await createOrderMutation.mutateAsync(order);
              }}
              isSubmitting={createOrderMutation.isPending}
            />
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
