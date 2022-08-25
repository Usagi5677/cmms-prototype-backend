/*
  Warnings:

  - You are about to drop the column `measurementPeriodicMaintenanceId` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `pmNotifPeriodicMaintenanceId` on the `Reminder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_measurementPeriodicMaintenanceId_fkey";

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_pmNotifPeriodicMaintenanceId_fkey";

-- AlterTable
ALTER TABLE "PeriodicMaintenance" ADD COLUMN     "measurement" TEXT;

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "measurementPeriodicMaintenanceId",
DROP COLUMN "pmNotifPeriodicMaintenanceId",
ADD COLUMN     "notificationPeriodicMaintenanceId" INTEGER;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_notificationPeriodicMaintenanceId_fkey" FOREIGN KEY ("notificationPeriodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
