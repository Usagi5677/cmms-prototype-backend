-- CreateTable
CREATE TABLE "InterServiceColorConfig" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "typeId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "measurement" TEXT,

    CONSTRAINT "InterServiceColorConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InterServiceColorConfig" ADD CONSTRAINT "InterServiceColorConfig_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterServiceColorConfig" ADD CONSTRAINT "InterServiceColorConfig_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
