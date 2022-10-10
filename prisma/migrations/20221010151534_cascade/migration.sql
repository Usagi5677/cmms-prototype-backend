-- DropForeignKey
ALTER TABLE "DivisionUsers" DROP CONSTRAINT "DivisionUsers_divisionId_fkey";

-- AddForeignKey
ALTER TABLE "DivisionUsers" ADD CONSTRAINT "DivisionUsers_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
