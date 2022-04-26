/*
  Warnings:

  - The `period` column on the `MachinePeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `notificationReminder` column on the `MachinePeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `period` column on the `TransportationPeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `notificationReminder` column on the `TransportationPeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "period",
ADD COLUMN     "period" INTEGER,
DROP COLUMN "notificationReminder",
ADD COLUMN     "notificationReminder" INTEGER;

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "period",
ADD COLUMN     "period" INTEGER,
DROP COLUMN "notificationReminder",
ADD COLUMN     "notificationReminder" INTEGER;
