import { z } from "zod"

export const GetCandlesQuerySchema = z.object({
    timeFrame: z.string(),
    asset: z.string(),
})

export type GetCandlesQueryType = z.infer<typeof GetCandlesQuerySchema>