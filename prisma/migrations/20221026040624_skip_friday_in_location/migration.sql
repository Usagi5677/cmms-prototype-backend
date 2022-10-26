/*
  Warnings:

  - You are about to drop the column `skipFriday` on the `ChecklistTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChecklistTemplate" DROP COLUMN "skipFriday";

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "skipFriday" BOOLEAN;
