-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "lastLocationId" INTEGER,
ADD COLUMN     "lastZoneId" INTEGER;

-- CreateTable
CREATE TABLE "UserAssignment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL,
    "divisionId" INTEGER,
    "locationId" INTEGER,
    "zoneId" INTEGER,

    CONSTRAINT "UserAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WarehouseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catalogue" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Catalogue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
