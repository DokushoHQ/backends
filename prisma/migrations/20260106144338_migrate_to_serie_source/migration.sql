/*
  Warnings:

  - You are about to drop the column `alternates_titles` on the `serie` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `serie` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `serie` table. All the data in the column will be lost.
  - You are about to drop the `_ScanlationGroupToSerieChapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chapter_override` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `serie_chapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `serie_chapter_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `serie_override` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ScanlationGroupToSerieChapter" DROP CONSTRAINT "_ScanlationGroupToSerieChapter_A_fkey";

-- DropForeignKey
ALTER TABLE "_ScanlationGroupToSerieChapter" DROP CONSTRAINT "_ScanlationGroupToSerieChapter_B_fkey";

-- DropForeignKey
ALTER TABLE "chapter_override" DROP CONSTRAINT "chapter_override_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "serie" DROP CONSTRAINT "serie_source_id_fkey";

-- DropForeignKey
ALTER TABLE "serie_chapter" DROP CONSTRAINT "serie_chapter_serie_id_fkey";

-- DropForeignKey
ALTER TABLE "serie_chapter_data" DROP CONSTRAINT "serie_chapter_data_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "serie_override" DROP CONSTRAINT "serie_override_serie_id_fkey";

-- DropIndex
DROP INDEX "serie_source_id_external_id_key";

-- AlterTable
ALTER TABLE "serie" DROP COLUMN "alternates_titles",
DROP COLUMN "external_id",
DROP COLUMN "source_id",
ADD COLUMN     "custom_cover" TEXT,
ADD COLUMN     "custom_metadata" JSONB,
ADD COLUMN     "locked_fields" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "synopsis" SET DATA TYPE TEXT,
ALTER COLUMN "cover" DROP NOT NULL;

-- DropTable
DROP TABLE "_ScanlationGroupToSerieChapter";

-- DropTable
DROP TABLE "chapter_override";

-- DropTable
DROP TABLE "serie_chapter";

-- DropTable
DROP TABLE "serie_chapter_data";

-- DropTable
DROP TABLE "serie_override";

-- CreateTable
CREATE TABLE "serie_source" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "alternates_titles" JSONB,
    "synopsis" JSONB,
    "status" "SerieStatus"[],
    "type" "SerieType" NOT NULL,
    "cover_source_url" TEXT NOT NULL,
    "cover" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "serie_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT,
    "chapter_number" DOUBLE PRECISION NOT NULL,
    "volume_number" INTEGER,
    "volume_name" TEXT,
    "language" "Language" NOT NULL,
    "date_upload" TIMESTAMP(3) NOT NULL,
    "external_url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "locked_fields" JSONB NOT NULL DEFAULT '[]',
    "custom_metadata" JSONB,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_data" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapter_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,

    CONSTRAINT "chapter_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChapterToScanlationGroup" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ChapterToScanlationGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "serie_source_source_id_external_id_key" ON "serie_source"("source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_source_id_external_id_key" ON "chapter"("source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_data_chapter_id_index_key" ON "chapter_data"("chapter_id", "index");

-- CreateIndex
CREATE INDEX "_ChapterToScanlationGroup_B_index" ON "_ChapterToScanlationGroup"("B");

-- AddForeignKey
ALTER TABLE "serie_source" ADD CONSTRAINT "serie_source_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_source" ADD CONSTRAINT "serie_source_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_data" ADD CONSTRAINT "chapter_data_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChapterToScanlationGroup" ADD CONSTRAINT "_ChapterToScanlationGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChapterToScanlationGroup" ADD CONSTRAINT "_ChapterToScanlationGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "scanlation_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
