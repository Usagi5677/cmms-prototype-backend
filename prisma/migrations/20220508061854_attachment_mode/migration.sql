-- AlterTable
ALTER TABLE "MachineAttachment" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT E'Public';

-- AlterTable
ALTER TABLE "TransportAttachment" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT E'Public';
