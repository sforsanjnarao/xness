/*
  Warnings:

  - You are about to drop the column `symbol` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `margin` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `symbol` on the `order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,asset]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialMargin` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `market` to the `order` table without a default value. This is not possible if the table is not empty.
  - Made the column `profit_and_loss` on table `order` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Asset" AS ENUM ('USDC');

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('BTC_USDC', 'SOL_USDC', 'ETH_USDC');

-- DropIndex
DROP INDEX "Wallet_userId_symbol_key";

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "symbol",
ADD COLUMN     "asset" "Asset" NOT NULL;

-- AlterTable
ALTER TABLE "order" DROP COLUMN "margin",
DROP COLUMN "symbol",
ADD COLUMN     "initialMargin" BIGINT NOT NULL,
ADD COLUMN     "market" "Market" NOT NULL,
ALTER COLUMN "profit_and_loss" SET NOT NULL,
ALTER COLUMN "profit_and_loss" SET DATA TYPE BIGINT;

-- DropEnum
DROP TYPE "Symbol";

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_asset_key" ON "Wallet"("userId", "asset");
