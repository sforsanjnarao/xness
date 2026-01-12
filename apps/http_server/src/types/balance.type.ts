export type wallet={
    id: string
    userId: string
    asset:string
    balanceRaw:bigint       //bigInt Means floating
    balanceDecimal:number
    createdAt:Date
    updatedAt:Date
}