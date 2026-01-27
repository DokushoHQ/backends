-- AlterTable
ALTER TABLE "serie_source" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "source" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "chapter_availability" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "language" "Language" NOT NULL,
    "missing_chapters" JSONB NOT NULL DEFAULT '[]',
    "missing_count" INTEGER NOT NULL DEFAULT 0,
    "fillable_count" INTEGER NOT NULL DEFAULT 0,
    "auto_enabled_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chapter_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fillable_chapter" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availability_id" UUID NOT NULL,
    "chapter_number" DOUBLE PRECISION NOT NULL,
    "chapter_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,

    CONSTRAINT "fillable_chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie_chapter_preference" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "use_secondary_fallback" JSONB NOT NULL DEFAULT '{}',
    "use_secondary_fallback_default" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_new_gaps" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_gap_filled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "serie_chapter_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chapter_availability_serie_id_idx" ON "chapter_availability"("serie_id");

-- CreateIndex
CREATE INDEX "chapter_availability_missing_count_idx" ON "chapter_availability"("missing_count");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_availability_serie_id_language_key" ON "chapter_availability"("serie_id", "language");

-- CreateIndex
CREATE INDEX "fillable_chapter_availability_id_idx" ON "fillable_chapter"("availability_id");

-- CreateIndex
CREATE UNIQUE INDEX "fillable_chapter_availability_id_chapter_number_chapter_id_key" ON "fillable_chapter"("availability_id", "chapter_number", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "serie_chapter_preference_serie_id_key" ON "serie_chapter_preference"("serie_id");

-- AddForeignKey
ALTER TABLE "chapter_availability" ADD CONSTRAINT "chapter_availability_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fillable_chapter" ADD CONSTRAINT "fillable_chapter_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "chapter_availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fillable_chapter" ADD CONSTRAINT "fillable_chapter_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fillable_chapter" ADD CONSTRAINT "fillable_chapter_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_chapter_preference" ADD CONSTRAINT "serie_chapter_preference_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
