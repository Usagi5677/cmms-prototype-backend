/*
  Warnings:

  - You are about to drop the column `divisionId` on the `UserAssignment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAssignment" DROP CONSTRAINT "UserAssignment_divisionId_fkey";

-- AlterTable
ALTER TABLE "UserAssignment" DROP COLUMN "divisionId",
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
