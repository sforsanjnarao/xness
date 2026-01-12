const API_BASE_URL = 'http://localhost:8001';


interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.message || `Request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// User API
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export const userApi = {
  signUp: (data: SignUpRequest) =>
    request<User>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signIn: (data: SignInRequest) =>
    request<User>('/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signOut: () =>
    request<void>('/v1/auth/signout', {
      method: 'POST',
    }),

  getUser: () => request<User>('/v1/auth/profile'),
};

// Order API
export type OrderSide = 'LONG' | 'SHORT';
export type OrderStatus = 'OPEN' | 'CLOSED';
export type CloseReason = 'MANUAL' | 'TP' | 'SL' | 'LIQUIDATION';
export type Market="BTC_USDC" | "SOL_USDC" | "ETH_USDC"

export type Order = {
  id: string;
  userId: string;
  side: "LONG" | "SHORT";
  // symbol: string;
  market: Market
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
  quantity: string;
  quantityDecimal: number;
  openPrice: number;
  closePrice: number | null;
  priceDecimals: number;
  leverage: number;
  margin: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  Pnl: number | null;
  reason: CloseReason;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};
export interface CreateOrderRequest {
  side: "LONG" | "SHORT";
  symbol: string;
  // market: Market
  quantity: number;
  leverage: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
}
// export interface CreateOrderRequest {
//   symbol: string;
//   side: OrderSide;
//   quantity: number;
//   leverage: number;
//   takeProfit?: number;
//   stopLoss?: number;
// }

export const orderApi = {
  create: (data: CreateOrderRequest) =>
    request<{ message: string; orderId: string }>('/v1/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

   close: (orderId: string, reason = "manual") =>
    request<{ message: string; orderId: string; finalPnl: number }>(
      `/v1/orders/${orderId}/close`,
      {
        method: 'POST',
        body: JSON.stringify({ closeReason: reason }),
      }
    ),

  getOpenOrders: () => request<Order[]>('/v1/orders/open-orders'),

  getAllOrders: () => request<Order[]>('/v1/orders/'),
  getById: (orderId: string) =>
    request<{ message: string; order: Order }>(`/v1/orders/${orderId}`)
};

// Candles API
export interface Candle {
    time: number | string; // Use string if your JSON sends "2026-01-08...", number if Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    symbol?: string; // Optional: based on your backend response
    bucket?: string; // Optional: based on your backend response
}

// 2. Define the structure of the API Response (The wrapper)
export interface CandlesResponse {
  data: Candle[];
}


export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export const candlesApi = {
  getCandles: (symbol: string, interval: CandleInterval = '1m') =>
    request<CandlesResponse>(`/v1/candles?asset=${symbol}&timeFrame=${interval}`,
      // {
      //   cache: 'no-store',
      // }
    ),
};

// Balance API
export interface Balance {
  USDC: number;
  BTC: number;
  ETH: number;
  SOL: number;
}

export interface DepositRequest {
  symbol: keyof Balance;
  amount: number;
}
export interface RawWallet {
  symbol: string;
  balanceRaw: string;
  balanceDecimal: number;
}
export interface SymbolWallet {
  symbol: string;
  balanceRaw: string;
  balanceDecimal: number;
}


export interface RawBalanceResponse {
  userAllWallet: RawWallet[];
}
const fromRaw = (raw: string, decimals: number) => {
  return Number(raw) / 10 ** decimals;
};

export const balanceApi = {
  getBalance: async () => {
    const { data, error } = await request<RawBalanceResponse>("/v1/balance");
    if (error) return { error };

    const wallet: Balance = {
      USDC: 0,
      BTC: 0,
      ETH: 0,
      SOL: 0,
    };

    data?.userAllWallet.forEach(w => {
      wallet[w.symbol as keyof Balance] = fromRaw(
        w.balanceRaw,
        w.balanceDecimal
      );
    });

    return { data: wallet };
  },
  // getBalanceBySymbol: (symbol: string) =>
  //   request<{ wallet: SymbolWallet }>(`/v1/balance/${symbol}`),

  deposit: (data: DepositRequest) =>
    request<Balance>('/v1/balance/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
