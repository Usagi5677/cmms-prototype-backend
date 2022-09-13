/*
  Warnings:

  - You are about to drop the column `userId` on the `Breakdown` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Repair` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Breakdown" DROP CONSTRAINT "Breakdown_userId_fkey";

-- DropForeignKey
ALTER TABLE "Repair" DROP CONSTRAINT "Repair_userId_fkey";

-- AlterTable
ALTER TABLE "Breakdown" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AlterTable
ALTER TABLE "Repair" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Breakdown" ADD CONSTRAINT "Breakdown_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
