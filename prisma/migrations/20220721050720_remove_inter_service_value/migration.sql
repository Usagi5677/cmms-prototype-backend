/*
  Warnings:

  - You are about to drop the column `interService` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `interServiceMileage` on the `Transportation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "interService";

-- AlterTable
ALTER TABLE "Transportation" DROP COLUMN "interServiceMileage";
