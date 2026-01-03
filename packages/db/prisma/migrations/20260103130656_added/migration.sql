/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "orderSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('OPEN', 'CLOSED', 'LIQUIDATION');

-- CreateEnum
CREATE TYPE "close_reason" AS ENUM ('take_profit', 'stop_loss', 'manual', 'liquidation');

-- CreateEnum
CREATE TYPE "Symbol" AS ENUM ('USDC', 'BTC', 'SOL', 'ETH');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "side" "orderSide" NOT NULL,
    "symbol" "Symbol" NOT NULL,
    "status" "order_status" NOT NULL,
    "quantity" BIGINT NOT NULL,
    "quantityDecimal" INTEGER NOT NULL,
    "openPrice" INTEGER NOT NULL,
    "closePrice" INTEGER NOT NULL,
    "priceDecimals" INTEGER NOT NULL,
    "leverage" INTEGER NOT NULL,
    "margin" INTEGER NOT NULL,
    "take_profit" INTEGER,
    "stop_loss" INTEGER,
    "profit_and_loss" INTEGER,
    "reason" "close_reason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" "Symbol" NOT NULL,
    "balanceRaw" BIGINT NOT NULL,
    "balanceDecimal" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_id_key" ON "Wallet"("id");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
