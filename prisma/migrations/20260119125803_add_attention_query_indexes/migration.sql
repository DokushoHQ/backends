-- CreateIndex
CREATE INDEX "chapter_serie_id_page_fetch_status_idx" ON "chapter"("serie_id", "page_fetch_status");

-- CreateIndex
CREATE INDEX "serie_cover_idx" ON "serie"("cover");

-- CreateIndex
CREATE INDEX "serie_source_serie_id_consecutive_failures_idx" ON "serie_source"("serie_id", "consecutive_failures");
