-- CreateIndex
CREATE INDEX "chapter_serie_id_enabled_language_idx" ON "chapter"("serie_id", "enabled", "language");
