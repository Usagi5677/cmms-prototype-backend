/*
  Warnings:

  - You are about to drop the column `completedAt` on the `SparePR` table. All the data in the column will be lost.
  - You are about to drop the column `completedById` on the `SparePR` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `SparePR` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `SparePR` table. All the data in the column will be lost.
  - Added the required column `name` to the `SparePR` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SparePR" DROP CONSTRAINT "SparePR_completedById_fkey";

-- AlterTable
ALTER TABLE "SparePR" DROP COLUMN "completedAt",
DROP COLUMN "completedById",
DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SparePR" ADD CONSTRAINT "SparePR_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
