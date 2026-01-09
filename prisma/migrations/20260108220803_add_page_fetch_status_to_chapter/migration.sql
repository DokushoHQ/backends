-- CreateEnum
CREATE TYPE "PageFetchStatus" AS ENUM ('Pending', 'InProgress', 'Success', 'Partial', 'Failed');

-- AlterTable
ALTER TABLE "chapter" ADD COLUMN     "page_fetch_status" "PageFetchStatus" NOT NULL DEFAULT 'Pending';
