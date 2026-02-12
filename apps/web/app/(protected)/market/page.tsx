'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { useQuery } from '@tanstack/react-query'
import { balanceApi } from '@/lib/api'
import TradePage from '../trade/page'
import WalletPage from '../wallet/page'

export default function MarketPage() {
  const [view, setView] = useState('trade')

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

  return (
    <div>
      <Header 
        usdcBalance={usdcBalance} 
        onNavigate={setView}
        activeView={view}
      />

      <div style={{ display: view === 'trade' ? 'block' : 'none' }}>
        <TradePage /> 
      </div>

      <div style={{ display: view === 'wallet' ? 'block' : 'none' }}>
        <WalletPage />
      </div>
    </div>
  )
}