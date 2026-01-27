-- Add available_count and ready_count columns
ALTER TABLE "chapter_availability" ADD COLUMN "available_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chapter_availability" ADD COLUMN "ready_count" INTEGER NOT NULL DEFAULT 0;

-- Migrate fillable_count data to ready_count
UPDATE "chapter_availability" SET "ready_count" = "fillable_count";

-- Drop fillable_count column
ALTER TABLE "chapter_availability" DROP COLUMN "fillable_count";
