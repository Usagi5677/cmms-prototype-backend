/*
  Warnings:

  - Made the column `name` on table `PeriodicMaintenance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PeriodicMaintenance" ALTER COLUMN "name" SET NOT NULL;
