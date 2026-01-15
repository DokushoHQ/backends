-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PageFetchStatus" ADD VALUE 'PermanentlyFailed';
ALTER TYPE "PageFetchStatus" ADD VALUE 'Incomplete';

-- AlterTable
ALTER TABLE "chapter_data" ADD COLUMN     "permanently_failed" BOOLEAN NOT NULL DEFAULT false;
