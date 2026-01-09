/*
  Warnings:

  - You are about to drop the column `consecutive_failures` on the `serie` table. All the data in the column will be lost.
  - You are about to drop the column `last_checked_at` on the `serie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "serie" DROP COLUMN "consecutive_failures",
DROP COLUMN "last_checked_at",
ADD COLUMN     "refreshed_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "serie_source" ADD COLUMN     "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_checked_at" TIMESTAMPTZ;
