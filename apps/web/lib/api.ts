const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USDC_DECIMALS = 8; // Hardcoded to match Backend
const ENGINE_SCALE = 8;  


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
    console.log('response:', response)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed with status ${response.status}` };
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
export type Market = "BTC_USDC" | "SOL_USDC" | "ETH_USDC"

export type Order = {
  id: string;
  userId: string;
  side: OrderSide;
  market: Market;
  status: OrderStatus;

  // These come as Strings from the backend (BigInt)
  quantity: string;
  openPrice: string;
  closePrice: string | null;
  initialMargin: string;
  Pnl: string | null;

  leverage: number;

  // Triggers
  takeProfitPrice: string | null;
  stopLossPrice: string | null;
  reason: CloseReason | null;

  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export interface CreateOrderRequest {
  side: OrderSide;
  market: Market;
  quantity: number; // User inputs Human Number (e.g. 1.5 BTC)
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
    ),
};

// Balance API
export interface WalletResponse {
  balance: string; // "1000000" (BigInt string)
  symbol: string;  // "USDC"
  formatted?: string;
}

export interface Balance {
  USDC: number;
}

export interface DepositRequest {
  symbol: "USDC";
  amount: number;
}



export const balanceApi = {
  getBalance: async () => {
    const { data, error } = await request<WalletResponse>("/v1/balance");
    if (error) return { error };
    const rawBalance = BigInt(data?.balance || "0");


    const humanBalance = Number(rawBalance) / Math.pow(10, USDC_DECIMALS);

    return {
      data: { USDC: humanBalance }
    };
  },

  deposit: (amount: number) =>

    request<WalletResponse>('/v1/balance/deposit', {
      method: 'POST',
      body: JSON.stringify({ symbol: "USDC", amount }),
    }),
};

