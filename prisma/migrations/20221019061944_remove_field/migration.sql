/*
  Warnings:

  - You are about to drop the column `previousMeterReading` on the `PeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PeriodicMaintenance" DROP COLUMN "previousMeterReading";
