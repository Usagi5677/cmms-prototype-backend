/*
  Warnings:

  - Added the required column `title` to the `MachinePeriodicMaintenance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `TransportationPeriodicMaintenance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TransportationPeriodicMaintenance" ADD COLUMN     "title" TEXT NOT NULL;
