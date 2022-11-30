-- AlterTable
ALTER TABLE "InterServiceColor" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "InterServiceColor" ADD CONSTRAINT "InterServiceColor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
