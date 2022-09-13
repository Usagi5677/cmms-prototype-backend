/*
  Warnings:

  - Made the column `type` on table `Breakdown` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Repair` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Breakdown" ALTER COLUMN "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "Repair" ALTER COLUMN "name" SET NOT NULL;
