/*
  Warnings:

  - You are about to drop the column `type` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "type",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT E'Pending';

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "type",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT E'Pending';
