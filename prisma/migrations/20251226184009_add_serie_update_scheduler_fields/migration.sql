-- AlterTable
ALTER TABLE "serie" ADD COLUMN     "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_checked_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "source" ADD COLUMN     "last_fetch_fingerprint" JSONB,
ADD COLUMN     "rate_limit_duration" INTEGER NOT NULL DEFAULT 30000,
ADD COLUMN     "rate_limit_max" INTEGER NOT NULL DEFAULT 1;
