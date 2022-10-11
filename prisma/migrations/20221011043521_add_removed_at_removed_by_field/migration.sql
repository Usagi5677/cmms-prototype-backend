-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" INTEGER;

-- AlterTable
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" INTEGER;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
