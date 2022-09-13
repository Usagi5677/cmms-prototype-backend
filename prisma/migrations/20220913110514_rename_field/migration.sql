/*
  Warnings:

  - You are about to drop the column `userId` on the `PeriodicMaintenanceComment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PeriodicMaintenanceComment" DROP CONSTRAINT "PeriodicMaintenanceComment_userId_fkey";

-- AlterTable
ALTER TABLE "PeriodicMaintenanceComment" DROP COLUMN "userId",
ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceComment" ADD CONSTRAINT "PeriodicMaintenanceComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
