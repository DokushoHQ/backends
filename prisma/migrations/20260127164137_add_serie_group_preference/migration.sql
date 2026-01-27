-- CreateTable
CREATE TABLE "serie_group_preference" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "language" "Language" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "serie_group_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "serie_group_preference_serie_id_language_idx" ON "serie_group_preference"("serie_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "serie_group_preference_serie_id_group_id_language_key" ON "serie_group_preference"("serie_id", "group_id", "language");

-- AddForeignKey
ALTER TABLE "serie_group_preference" ADD CONSTRAINT "serie_group_preference_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_group_preference" ADD CONSTRAINT "serie_group_preference_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "scanlation_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
