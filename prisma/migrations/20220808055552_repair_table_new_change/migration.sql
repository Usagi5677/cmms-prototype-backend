/*
  Warnings:

  - You are about to drop the column `description` on the `EntityRepair` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `EntityRepair` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `EntityRepair` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EntityRepair" DROP COLUMN "description",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "approverId" INTEGER,
ADD COLUMN     "attendInfo" TEXT,
ADD COLUMN     "internal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "operatorId" INTEGER,
ADD COLUMN     "projectManagerId" INTEGER,
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "requestorId" INTEGER,
ADD COLUMN     "supervisorId" INTEGER;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRepair" ADD CONSTRAINT "EntityRepair_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
