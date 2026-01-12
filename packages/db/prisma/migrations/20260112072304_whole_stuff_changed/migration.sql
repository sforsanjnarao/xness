/*
  Warnings:

  - You are about to drop the column `closePrice` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `initialMargin` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `openPrice` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `priceDecimals` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `quantityDecimal` on the `order` table. All the data in the column will be lost.
  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `initial_margin` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `open_price` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- AlterTable
ALTER TABLE "order" DROP COLUMN "closePrice",
DROP COLUMN "initialMargin",
DROP COLUMN "openPrice",
DROP COLUMN "priceDecimals",
DROP COLUMN "quantityDecimal",
ADD COLUMN     "close_price" BIGINT,
ADD COLUMN     "initial_margin" BIGINT NOT NULL,
ADD COLUMN     "open_price" BIGINT NOT NULL,
ALTER COLUMN "take_profit" SET DATA TYPE BIGINT,
ALTER COLUMN "stop_loss" SET DATA TYPE BIGINT,
ALTER COLUMN "profit_and_loss" DROP NOT NULL;

-- DropTable
DROP TABLE "Wallet";

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" "Asset" NOT NULL DEFAULT 'USDC',
    "balanceRaw" BIGINT NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
