/*
  Warnings:

  - You are about to drop the `InterServiceColorConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InterServiceColorConfig" DROP CONSTRAINT "InterServiceColorConfig_brandId_fkey";

-- DropForeignKey
ALTER TABLE "InterServiceColorConfig" DROP CONSTRAINT "InterServiceColorConfig_typeId_fkey";

-- DropTable
DROP TABLE "InterServiceColorConfig";

-- CreateTable
CREATE TABLE "InterServiceColor" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "typeId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "measurement" TEXT,

    CONSTRAINT "InterServiceColor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InterServiceColor" ADD CONSTRAINT "InterServiceColor_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterServiceColor" ADD CONSTRAINT "InterServiceColor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
