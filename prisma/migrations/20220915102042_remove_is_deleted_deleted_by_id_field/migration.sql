/*
  Warnings:

  - You are about to drop the column `deletedById` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Entity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_deletedById_fkey";

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "deletedById",
DROP COLUMN "isDeleted";
