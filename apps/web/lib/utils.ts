import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const formatTokenAmount = (raw: string | number, decimals: number) => {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  return num / Math.pow(10, decimals);
};


export const getMarketDetails = (symbol: string) => {
  // Handle "BTC_USDC" format (from Backpack)
  if (symbol.includes('_')) {
    const [base, quote] = symbol.split('_');
    return { base, quote };
  }
  
  // Handle "BTCUSDC" format
  if (symbol.endsWith('USDC')) {
    return { base: symbol.replace('USDC', ''), quote: 'USDC' };
  }
  
  return { base: symbol, quote: 'USDC' };
};

export const toCamalCaseSymbol = (symbol: string) => {
  return symbol.replace('_', '');
}
export function normalizeSymbol(symbol: string):string {
  if (symbol.includes("_")) {
    return symbol.split("_")[0] as string;
  }
  return symbol.replace("USDC", "");
}

