-- CreateTable
CREATE TABLE "serie_override" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "locked_fields" JSONB NOT NULL DEFAULT '[]',
    "title" JSONB,
    "alternates_titles" JSONB,
    "synopsis" JSONB,
    "primary_title" TEXT,
    "primary_synopsis" TEXT,
    "cover" TEXT,
    "status" "SerieStatus"[],
    "type" "SerieType",
    "custom_metadata" JSONB,

    CONSTRAINT "serie_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_override" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapter_id" UUID NOT NULL,
    "locked_fields" JSONB NOT NULL DEFAULT '[]',
    "title" JSONB,
    "primary_title" TEXT,
    "chapter_number" DOUBLE PRECISION,
    "volume_number" INTEGER,
    "volume_name" TEXT,
    "custom_metadata" JSONB,

    CONSTRAINT "chapter_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "serie_override_serie_id_key" ON "serie_override"("serie_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_override_chapter_id_key" ON "chapter_override"("chapter_id");

-- AddForeignKey
ALTER TABLE "serie_override" ADD CONSTRAINT "serie_override_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_override" ADD CONSTRAINT "chapter_override_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "serie_chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
