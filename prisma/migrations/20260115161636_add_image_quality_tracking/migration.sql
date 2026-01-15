-- AlterTable
ALTER TABLE "chapter_data" ADD COLUMN     "image_quality" TEXT,
ADD COLUMN     "metadata_issues" JSONB;

-- CreateIndex
CREATE INDEX "chapter_data_image_quality_idx" ON "chapter_data"("image_quality");
