-- CreateEnum
CREATE TYPE "DuplicateGroupStatus" AS ENUM ('Pending', 'Merged', 'Dismissed');

-- CreateTable
CREATE TABLE "duplicate_group" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DuplicateGroupStatus" NOT NULL DEFAULT 'Pending',
    "confidence" DOUBLE PRECISION NOT NULL,
    "members" JSONB NOT NULL,
    "suggested_primary_id" UUID,
    "merged_into_id" UUID,
    "merged_at" TIMESTAMPTZ,

    CONSTRAINT "duplicate_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "duplicate_group_status_idx" ON "duplicate_group"("status");
