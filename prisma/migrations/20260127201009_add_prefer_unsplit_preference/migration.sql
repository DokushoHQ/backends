-- AlterTable
ALTER TABLE "serie_chapter_preference" ADD COLUMN     "prefer_unsplit" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "prefer_unsplit_default" BOOLEAN NOT NULL DEFAULT true;
