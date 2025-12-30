declare namespace Express{
    interface Request{
        user?:{id:string}
    }
}



// not order it's future market
// model Order {
//   id                String       @id @default(uuid()) @db.Uuid
//   userId            String       @map("user_id") @db.Uuid
//   symbol            Symbol       // Add this - what asset is being traded
//   side              OrderSide    @map("side") //long/short
//   status            OrderStatus  @default(open)//open/close

//   // Quantities (stored as integers, use decimals for display)
//   quantity          BigInt      @map("quantity") //quantity we given
//   quantityDecimals  Int         @default(2) @map("quantity_decimals")

//   // Prices (stored as integers to avoid floating point issues)
//   openPrice     Int  @map("open_price") //
//   closePrice    Int? @map("close_price")
//   priceDecimals Int  @default(2) @map("price_decimals")

//   // Risk Management
//   leverage          Int          @default(1)
//   margin            Int          @map("margin_required")

//   takeProfitPrice   Int?         @map("take_profit_price")
//   stopLossPrice     Int?         @map("stop_loss_price")

//   // P&L (Profit and Loss)
//   Pnl               Int?         @map("realized_pnl") // null if open

//   // Lifecycle
//   closeReason       CloseReason? @map("close_reason")
//   createdAt         DateTime     @default(now()) @map("created_at")
//   updatedAt         DateTime     @updatedAt @map("updated_at")
//   closedAt          DateTime?    @map("closed_at")

//   // Relations
//   user User @relation(fields: [userId], references: [id], onDelete: Cascade)

//   // Constraints & Indexes
//   @@index([userId, status])
//   @@index([status, createdAt])
//   @@index([symbol, status])
//   @@map("orders")
// }