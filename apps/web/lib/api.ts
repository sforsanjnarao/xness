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

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  markPrice?: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
  status: OrderStatus;
  closeReason?: CloseReason;
  pnl?: number;
  createdAt: string;
  closedAt?: string;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
}

export const orderApi = {
  create: (data: CreateOrderRequest) =>
    request<Order>('/v1/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  close: (orderId: string) =>
    request<Order>(`/v1/order/${orderId}/close`, {
      method: 'POST',
    }),

  getOpenOrders: () => request<Order[]>('/v1/orders/open-orders'),

  getAllOrders: () => request<Order[]>('/v1/orders/'),
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
    request<CandlesResponse>(`/v1/candles?asset=${symbol}&timeFrame=${interval}`),
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

export const balanceApi = {
  getBalance: () => request<Balance>('/v1/balance'),

  deposit: (data: DepositRequest) =>
    request<Balance>('/v1/balance/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
