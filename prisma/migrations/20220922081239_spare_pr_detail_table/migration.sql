-- CreateTable
CREATE TABLE "SparePRDetail" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sparePRId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "SparePRDetail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SparePRDetail" ADD CONSTRAINT "SparePRDetail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePRDetail" ADD CONSTRAINT "SparePRDetail_sparePRId_fkey" FOREIGN KEY ("sparePRId") REFERENCES "SparePR"("id") ON DELETE CASCADE ON UPDATE CASCADE;
