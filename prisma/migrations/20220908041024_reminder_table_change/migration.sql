/*
  Warnings:

  - You are about to drop the column `notificationPeriodicMaintenanceId` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `trigger` on the `Reminder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_notificationPeriodicMaintenanceId_fkey";

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "notificationPeriodicMaintenanceId",
DROP COLUMN "trigger",
ADD COLUMN     "originId" INTEGER,
ADD COLUMN     "periodicMaintenanceId" INTEGER,
ALTER COLUMN "type" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_periodicMaintenanceId_fkey" FOREIGN KEY ("periodicMaintenanceId") REFERENCES "PeriodicMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
