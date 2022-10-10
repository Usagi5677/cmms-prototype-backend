-- DropForeignKey
ALTER TABLE "DivisionUsers" DROP CONSTRAINT "DivisionUsers_userId_fkey";

-- AddForeignKey
ALTER TABLE "DivisionUsers" ADD CONSTRAINT "DivisionUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
