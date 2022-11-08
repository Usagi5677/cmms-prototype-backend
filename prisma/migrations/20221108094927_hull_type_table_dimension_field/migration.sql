-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "dimension" INTEGER,
ADD COLUMN     "hullTypeId" INTEGER;

-- CreateTable
CREATE TABLE "HullType" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HullType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_hullTypeId_fkey" FOREIGN KEY ("hullTypeId") REFERENCES "HullType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
