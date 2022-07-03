/*
  Warnings:

  - You are about to drop the column `description` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `fixedDate` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `notificationReminder` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "description",
DROP COLUMN "fixedDate",
DROP COLUMN "notificationReminder",
DROP COLUMN "period",
ADD COLUMN     "measurement" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "value" INTEGER;
