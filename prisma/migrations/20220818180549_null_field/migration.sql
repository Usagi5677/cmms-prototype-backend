/*
  Warnings:

  - You are about to drop the column `periodicMaintenanceTaskId` on the `PeriodicMaintenanceComment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PeriodicMaintenanceComment" DROP CONSTRAINT "PeriodicMaintenanceComment_periodicMaintenanceTaskId_fkey";

-- AlterTable
ALTER TABLE "PeriodicMaintenanceComment" DROP COLUMN "periodicMaintenanceTaskId",
ADD COLUMN     "taskId" INTEGER;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenanceComment" ADD CONSTRAINT "PeriodicMaintenanceComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PeriodicMaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
