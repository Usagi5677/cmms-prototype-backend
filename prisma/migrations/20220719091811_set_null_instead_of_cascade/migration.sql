-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_dailyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_weeklyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_dailyChecklistTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Transportation" DROP CONSTRAINT "Transportation_weeklyChecklistTemplateId_fkey";

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_dailyChecklistTemplateId_fkey" FOREIGN KEY ("dailyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_weeklyChecklistTemplateId_fkey" FOREIGN KEY ("weeklyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_dailyChecklistTemplateId_fkey" FOREIGN KEY ("dailyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_weeklyChecklistTemplateId_fkey" FOREIGN KEY ("weeklyChecklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
