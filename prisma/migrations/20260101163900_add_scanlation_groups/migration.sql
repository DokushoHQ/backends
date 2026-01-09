-- CreateTable
CREATE TABLE "scanlation_group" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "scanlation_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ScanlationGroupToSerieChapter" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ScanlationGroupToSerieChapter_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "scanlation_group_source_id_external_id_key" ON "scanlation_group"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "_ScanlationGroupToSerieChapter_B_index" ON "_ScanlationGroupToSerieChapter"("B");

-- AddForeignKey
ALTER TABLE "scanlation_group" ADD CONSTRAINT "scanlation_group_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScanlationGroupToSerieChapter" ADD CONSTRAINT "_ScanlationGroupToSerieChapter_A_fkey" FOREIGN KEY ("A") REFERENCES "scanlation_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScanlationGroupToSerieChapter" ADD CONSTRAINT "_ScanlationGroupToSerieChapter_B_fkey" FOREIGN KEY ("B") REFERENCES "serie_chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
