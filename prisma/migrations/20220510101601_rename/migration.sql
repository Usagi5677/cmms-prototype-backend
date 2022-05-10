/*
  Warnings:

  - You are about to drop the column `isVessel` on the `Transportation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transportation" DROP COLUMN "isVessel",
ADD COLUMN     "transportType" TEXT DEFAULT E'Vehicle';
