-- CreateIndex
CREATE INDEX "serie_soft_deleted_at_updated_at_idx" ON "serie"("soft_deleted_at", "updated_at" DESC);
