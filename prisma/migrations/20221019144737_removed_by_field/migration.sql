-- AlterTable
ALTER TABLE "PeriodicMaintenance" ADD COLUMN     "removedById" INTEGER;

-- AddForeignKey
ALTER TABLE "PeriodicMaintenance" ADD CONSTRAINT "PeriodicMaintenance_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
