-- CreateTable
CREATE TABLE "Breakdown" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "type" TEXT,

    CONSTRAINT "Breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownDetail" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "breakdownId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "completedById" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BreakdownDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownComment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT E'Remark',
    "description" TEXT NOT NULL,
    "breakdownId" INTEGER,
    "detailId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "BreakdownComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Breakdown" ADD CONSTRAINT "Breakdown_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownDetail" ADD CONSTRAINT "BreakdownDetail_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownDetail" ADD CONSTRAINT "BreakdownDetail_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "Breakdown"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownComment" ADD CONSTRAINT "BreakdownComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownComment" ADD CONSTRAINT "BreakdownComment_breakdownId_fkey" FOREIGN KEY ("breakdownId") REFERENCES "Breakdown"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownComment" ADD CONSTRAINT "BreakdownComment_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "BreakdownDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
