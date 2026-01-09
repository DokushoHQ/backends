-- AlterTable
ALTER TABLE "serie" ADD COLUMN     "pending_delete_job_id" TEXT,
ADD COLUMN     "soft_deleted_at" TIMESTAMPTZ;
