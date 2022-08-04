/*
  Warnings:

  - Made the column `status` on table `Entity` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Entity" ALTER COLUMN "status" SET NOT NULL;
