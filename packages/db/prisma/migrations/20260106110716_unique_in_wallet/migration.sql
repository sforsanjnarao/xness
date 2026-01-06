/*
  Warnings:

  - A unique constraint covering the columns `[userId,symbol]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_symbol_key" ON "Wallet"("userId", "symbol");
