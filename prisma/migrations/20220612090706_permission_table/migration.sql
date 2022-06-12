/*
  Warnings:

  - You are about to drop the column `permission` on the `PermissionRole` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roleId,permissionId]` on the table `PermissionRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permissionId` to the `PermissionRole` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PermissionRole_roleId_permission_key";

-- AlterTable
ALTER TABLE "PermissionRole" DROP COLUMN "permission",
ADD COLUMN     "permissionId" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "Permission";

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionRole_roleId_permissionId_key" ON "PermissionRole"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "PermissionRole" ADD CONSTRAINT "PermissionRole_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
