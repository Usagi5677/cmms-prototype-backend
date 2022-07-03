-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "deletedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
