-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
