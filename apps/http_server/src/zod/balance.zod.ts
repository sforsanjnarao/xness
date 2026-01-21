import { z } from "zod"
// import {type Symbol, SYMBOL_DECIMALS,} from "@repo/types"

export const SymbolSchema = z.enum(["SOL", "BTC", "USDC", "ETH"])

// Re-export for backwards compatibility
// export { SYMBOL_DECIMALS };
// export type { Symbol };

export const GetWalletBalanceBySymbol = z.object({
    symbol: SymbolSchema
})

export const DepositWalletBalanceBySymbol = z.object({
    symbol: SymbolSchema,
    amount: z.coerce.number().positive(),
    // Make decimals optional - will be auto-determined from symbol
    decimals: z.coerce.number().int().min(0).max(18).optional()
})


export type GetWalletBalanceType = z.infer<typeof GetWalletBalanceBySymbol>

export type DepositWalletType = z.infer<typeof DepositWalletBalanceBySymbol>
