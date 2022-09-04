/*
  Warnings:

  - You are about to drop the column `status` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `entityStatus` on the `EntityHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "EntityHistory" DROP COLUMN "entityStatus";

-- DropEnum
DROP TYPE "EntityStatus";
