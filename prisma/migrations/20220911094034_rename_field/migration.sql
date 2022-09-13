/*
  Warnings:

  - You are about to drop the column `userId` on the `BreakdownDetail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BreakdownDetail" DROP CONSTRAINT "BreakdownDetail_userId_fkey";

-- AlterTable
ALTER TABLE "BreakdownDetail" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "BreakdownDetail" ADD CONSTRAINT "BreakdownDetail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
