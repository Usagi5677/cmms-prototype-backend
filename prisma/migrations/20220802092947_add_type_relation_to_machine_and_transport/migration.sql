/*
  Warnings:

  - You are about to drop the column `type` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Transportation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Transportation" DROP COLUMN "type";

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transportation" ADD CONSTRAINT "Transportation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
