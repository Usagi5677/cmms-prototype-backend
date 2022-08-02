-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "typeId" INTEGER;

-- AlterTable
ALTER TABLE "Transportation" ADD COLUMN     "typeId" INTEGER;

-- CreateTable
CREATE TABLE "Type" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Type_pkey" PRIMARY KEY ("id")
);
