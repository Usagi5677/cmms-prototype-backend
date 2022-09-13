-- AlterTable
ALTER TABLE "BreakdownDetail" ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "BreakdownDetail" ADD CONSTRAINT "BreakdownDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
