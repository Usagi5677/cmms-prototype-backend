/*
  Warnings:

  - You are about to drop the `TransportAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TransportAttachment" DROP CONSTRAINT "TransportAttachment_transportationId_fkey";

-- DropForeignKey
ALTER TABLE "TransportAttachment" DROP CONSTRAINT "TransportAttachment_userId_fkey";

-- DropTable
DROP TABLE "TransportAttachment";

-- CreateTable
CREATE TABLE "TransportationAttachment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "transportationId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "mimeType" TEXT,
    "originalName" TEXT,
    "sharepointFileName" TEXT,
    "mode" TEXT NOT NULL DEFAULT E'Public',

    CONSTRAINT "TransportationAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransportationAttachment" ADD CONSTRAINT "TransportationAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationAttachment" ADD CONSTRAINT "TransportationAttachment_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
