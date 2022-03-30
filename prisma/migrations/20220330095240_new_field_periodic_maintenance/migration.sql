/*
  Warnings:

  - The `status` column on the `MachinePeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `TransportationPeriodicMaintenance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PeriodicMaintenanceStatus" AS ENUM ('Done', 'Pending', 'Missed');

-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" DROP COLUMN "status",
ADD COLUMN     "status" "PeriodicMaintenanceStatus" NOT NULL DEFAULT E'Pending';

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" DROP COLUMN "status",
ADD COLUMN     "status" "PeriodicMaintenanceStatus" NOT NULL DEFAULT E'Pending';
