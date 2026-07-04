-- Convert the implicit Chapter<->ScanlationGroup m2m table into the explicit
-- ChapterGroup model using renames only: no data is copied, removed or rewritten.
ALTER TABLE "_ChapterToScanlationGroup" RENAME TO "chapter_group";
ALTER TABLE "chapter_group" RENAME COLUMN "A" TO "chapter_id";
ALTER TABLE "chapter_group" RENAME COLUMN "B" TO "group_id";
ALTER TABLE "chapter_group" RENAME CONSTRAINT "_ChapterToScanlationGroup_AB_pkey" TO "chapter_group_pkey";
ALTER TABLE "chapter_group" RENAME CONSTRAINT "_ChapterToScanlationGroup_A_fkey" TO "chapter_group_chapter_id_fkey";
ALTER TABLE "chapter_group" RENAME CONSTRAINT "_ChapterToScanlationGroup_B_fkey" TO "chapter_group_group_id_fkey";
ALTER INDEX "_ChapterToScanlationGroup_B_index" RENAME TO "chapter_group_group_id_idx";
