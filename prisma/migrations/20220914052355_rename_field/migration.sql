/*
  Warnings:

  - You are about to drop the column `dailyReading` on the `Checklist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Checklist" DROP COLUMN "dailyReading",
ADD COLUMN     "dailyUsageHours" INTEGER;
