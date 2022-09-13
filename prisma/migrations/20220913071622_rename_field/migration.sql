/*
  Warnings:

  - You are about to drop the column `userId` on the `BreakdownComment` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RepairComment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BreakdownComment" DROP CONSTRAINT "BreakdownComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "RepairComment" DROP CONSTRAINT "RepairComment_userId_fkey";

-- AlterTable
ALTER TABLE "BreakdownComment" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AlterTable
ALTER TABLE "RepairComment" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "RepairComment" ADD CONSTRAINT "RepairComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownComment" ADD CONSTRAINT "BreakdownComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
