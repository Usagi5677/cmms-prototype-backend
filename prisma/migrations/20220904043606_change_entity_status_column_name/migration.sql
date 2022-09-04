/*
 Warnings:
 
 - You are about to drop the column `entityStatus` on the `Entity` table. All the data in the column will be lost.
 - You are about to drop the column `status` on the `EntityHistory` table. All the data in the column will be lost.
 
 ** This migration file has been change manually to avoid dropping the column.
 */
-- AlterTable
ALTER TABLE "Entity"
  RENAME COLUMN "entityStatus" TO "status";
-- AlterTable
ALTER TABLE "EntityHistory"
  RENAME COLUMN "status" TO "entityStatus";