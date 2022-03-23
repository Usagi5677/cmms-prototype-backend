-- CreateEnum
CREATE TYPE "SparePRStatus" AS ENUM ('Done', 'Pending');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('Done', 'Pending');

-- CreateEnum
CREATE TYPE "BreakdownStatus" AS ENUM ('Done', 'Pending');

-- CreateTable
CREATE TABLE "MachineRepair" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "machineId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "RepairStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "MachineRepair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineBreakdown" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "machineId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "BreakdownStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "MachineBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSparePR" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "machineId" INTEGER NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "SparePRStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "MachineSparePR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportationRepair" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transportationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "RepairStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "TransportationRepair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportationBreakdown" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transportationId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "BreakdownStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "TransportationBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportationSparePR" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transportationId" INTEGER NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),
    "status" "SparePRStatus" NOT NULL DEFAULT E'Pending',

    CONSTRAINT "TransportationSparePR_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MachineRepair" ADD CONSTRAINT "MachineRepair_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRepair" ADD CONSTRAINT "MachineRepair_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineBreakdown" ADD CONSTRAINT "MachineBreakdown_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineBreakdown" ADD CONSTRAINT "MachineBreakdown_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePR" ADD CONSTRAINT "MachineSparePR_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePR" ADD CONSTRAINT "MachineSparePR_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationRepair" ADD CONSTRAINT "TransportationRepair_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationRepair" ADD CONSTRAINT "TransportationRepair_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationBreakdown" ADD CONSTRAINT "TransportationBreakdown_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationBreakdown" ADD CONSTRAINT "TransportationBreakdown_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationSparePR" ADD CONSTRAINT "TransportationSparePR_transportationId_fkey" FOREIGN KEY ("transportationId") REFERENCES "Transportation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportationSparePR" ADD CONSTRAINT "TransportationSparePR_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
