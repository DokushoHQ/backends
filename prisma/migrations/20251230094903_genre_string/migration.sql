-- AlterTable: Convert SerieGenre enum to TEXT
-- The enum values are already stored as the @map strings (e.g., "Slice of Life")
ALTER TABLE "genre" ALTER COLUMN "title" TYPE TEXT USING "title"::TEXT;
