/*
  Warnings:

  - You are about to drop the `EntitySparePR` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EntitySparePR" DROP CONSTRAINT "EntitySparePR_completedById_fkey";

-- DropForeignKey
ALTER TABLE "EntitySparePR" DROP CONSTRAINT "EntitySparePR_entityId_fkey";

-- DropTable
DROP TABLE "EntitySparePR";

-- CreateTable
CREATE TABLE "SparePR" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SparePR_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SparePR" ADD CONSTRAINT "SparePR_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePR" ADD CONSTRAINT "SparePR_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
