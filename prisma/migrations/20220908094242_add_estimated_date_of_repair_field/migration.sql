/*
  Warnings:

  - You are about to drop the column `completedAt` on the `BreakdownDetail` table. All the data in the column will be lost.
  - You are about to drop the column `completedById` on the `BreakdownDetail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BreakdownDetail" DROP CONSTRAINT "BreakdownDetail_completedById_fkey";

-- AlterTable
ALTER TABLE "Breakdown" ADD COLUMN     "estimatedDateOfRepair" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BreakdownDetail" DROP COLUMN "completedAt",
DROP COLUMN "completedById";
