-- AlterTable
ALTER TABLE "ChecklistComment" ADD COLUMN     "itemId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT E'Comment';

-- AddForeignKey
ALTER TABLE "ChecklistComment" ADD CONSTRAINT "ChecklistComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
