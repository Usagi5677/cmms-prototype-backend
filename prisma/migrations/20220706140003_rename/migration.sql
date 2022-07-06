/*
  Warnings:

  - You are about to drop the column `verifiedDate` on the `MachinePeriodicMaintenance` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedDate` on the `TransportationPeriodicMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "verifiedDate",
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "verifiedDate",
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
