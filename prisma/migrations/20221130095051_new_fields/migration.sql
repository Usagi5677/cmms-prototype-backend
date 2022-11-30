/*
  Warnings:

  - Made the column `measurement` on table `InterServiceColor` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InterServiceColor" ADD COLUMN     "greaterThan" INTEGER,
ADD COLUMN     "lessThan" INTEGER,
ALTER COLUMN "measurement" SET NOT NULL;
