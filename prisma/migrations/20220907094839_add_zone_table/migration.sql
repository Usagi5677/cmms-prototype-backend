-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
