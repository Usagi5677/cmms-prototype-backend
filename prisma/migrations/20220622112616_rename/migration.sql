/*
  Warnings:

  - You are about to drop the column `period` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "period",
ADD COLUMN     "measurement" TEXT;
