-- AlterTable
ALTER TABLE "MachineHistory" ADD COLUMN     "completedById" INTEGER;

-- AddForeignKey
ALTER TABLE "MachineHistory" ADD CONSTRAINT "MachineHistory_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
