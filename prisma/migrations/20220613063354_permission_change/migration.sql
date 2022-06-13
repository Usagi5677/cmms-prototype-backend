/*
  Warnings:

  - You are about to drop the column `permissionId` on the `PermissionRole` table. All the data in the column will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[roleId]` on the table `PermissionRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permission` to the `PermissionRole` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PermissionRole" DROP CONSTRAINT "PermissionRole_permissionId_fkey";

-- DropIndex
DROP INDEX "PermissionRole_roleId_permissionId_key";

-- AlterTable
ALTER TABLE "PermissionRole" DROP COLUMN "permissionId",
ADD COLUMN     "permission" TEXT NOT NULL;

-- DropTable
DROP TABLE "Permission";

-- CreateIndex
CREATE UNIQUE INDEX "PermissionRole_roleId_key" ON "PermissionRole"("roleId");
