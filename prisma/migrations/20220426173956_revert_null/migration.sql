/*
  Warnings:

  - Made the column `description` on table `MachinePeriodicMaintenance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `MachinePeriodicMaintenance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MachinePeriodicMaintenance" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL;
