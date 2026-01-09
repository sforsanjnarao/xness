/*
  Warnings:

  - The values [BTC_USDC,SOL_USDC,ETH_USDC] on the enum `Symbol` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Symbol_new" AS ENUM ('USDC', 'BTC', 'SOL', 'ETH');
ALTER TABLE "order" ALTER COLUMN "symbol" TYPE "Symbol_new" USING ("symbol"::text::"Symbol_new");
ALTER TABLE "Wallet" ALTER COLUMN "symbol" TYPE "Symbol_new" USING ("symbol"::text::"Symbol_new");
ALTER TYPE "Symbol" RENAME TO "Symbol_old";
ALTER TYPE "Symbol_new" RENAME TO "Symbol";
DROP TYPE "public"."Symbol_old";
COMMIT;
