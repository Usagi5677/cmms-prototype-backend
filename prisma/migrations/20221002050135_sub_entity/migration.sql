-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "parentEntityId" INTEGER;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
