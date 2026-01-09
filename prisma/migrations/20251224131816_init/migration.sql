-- CreateEnum
CREATE TYPE "SerieGenre" AS ENUM ('Unknown', 'Other', 'Four Koma', 'Action', 'Adaptation', 'Adult', 'Adventure', 'Aliens', 'Animals', 'Anthology', 'Award Winning', 'Boys Love', 'Comedy', 'Cooking', 'Crime', 'Cross-dressing', 'Delinquents', 'Demons', 'Doujinshi', 'Drama', 'Ecchi', 'Fan Colored', 'Fantasy', 'Full Color', 'Gender Bender', 'Gender Swap', 'Ghost', 'Girls Love', 'Gore', 'Gyaru', 'Harem', 'Hentai', 'Historical', 'Horror', 'Incest', 'Isekai', 'Josei', 'Kids', 'Lolicon', 'Long Strip', 'Mafia', 'Magic', 'Magical Girls', 'Martial Arts', 'Mature', 'Mecha', 'Medical', 'Military', 'Monster Girls', 'Monsters', 'Music', 'Mystery', 'Ninja', 'Office Workers', 'Official Colored', 'OneShot', 'Philosophical', 'Police', 'Post Apocalyptic', 'Psychological', 'Psychological Romance', 'Reincarnation', 'Reverse Harem', 'Romance', 'Samurai', 'School Life', 'Sci-fi', 'Seinen', 'Self Published', 'Sexual Violence', 'Shotacon', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Smut', 'Space', 'Sports', 'Superhero', 'Supernatural', 'Survival', 'Suspense', 'Thriller', 'Time Travel', 'Toomics', 'Traditional Games', 'Tragedy', 'Vampires', 'Video Games', 'Villainess', 'Virtual Reality', 'WebComic', 'Wuxia', 'Yaoi', 'Yuri', 'Zombies');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('En', 'Jp', 'JpRo', 'Fr', 'Ko', 'KoRo', 'ZhHk', 'Zh');

-- CreateEnum
CREATE TYPE "SerieStatus" AS ENUM ('Ongoing', 'Completed', 'Hiatus', 'Canceled', 'Publishing', 'Published', 'Scanlating', 'Scanlated', 'Unknown');

-- CreateEnum
CREATE TYPE "SerieType" AS ENUM ('Manga', 'Manhwa', 'Manhua', 'Webtoon', 'Lightnovel', 'Novel', 'Doujinshi', 'Comic', 'Oel', 'Unknown');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "nsfw" BOOLEAN NOT NULL,
    "languages" "Language"[],
    "search_filters" JSONB NOT NULL,
    "timeout" INTEGER NOT NULL,
    "can_block_scraping" BOOLEAN NOT NULL,
    "minimum_update_interval" INTEGER NOT NULL,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "alternates_titles" JSONB,
    "synopsis" JSONB,
    "cover" TEXT NOT NULL,
    "status" "SerieStatus"[],
    "type" "SerieType" NOT NULL,

    CONSTRAINT "serie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie_chapter" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serie_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "chapter_number" DOUBLE PRECISION NOT NULL,
    "volume_number" INTEGER,
    "volume_name" TEXT,
    "language" "Language" NOT NULL,
    "date_upload" TIMESTAMP(3) NOT NULL,
    "external_url" TEXT,

    CONSTRAINT "serie_chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie_chapter_data" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chapter_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,

    CONSTRAINT "serie_chapter_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre" (
    "id" UUID NOT NULL,
    "title" "SerieGenre" NOT NULL,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToSerie" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_GenreToSerie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AuthorToSerie" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AuthorToSerie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArtistToSerie" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ArtistToSerie_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "source_external_id_key" ON "source"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_name_key" ON "source"("name");

-- CreateIndex
CREATE UNIQUE INDEX "serie_source_id_external_id_key" ON "serie"("source_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "serie_chapter_serie_id_external_id_key" ON "serie_chapter"("serie_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "serie_chapter_data_chapter_id_index_key" ON "serie_chapter_data"("chapter_id", "index");

-- CreateIndex
CREATE UNIQUE INDEX "genre_title_key" ON "genre"("title");

-- CreateIndex
CREATE UNIQUE INDEX "author_name_key" ON "author"("name");

-- CreateIndex
CREATE UNIQUE INDEX "artist_name_key" ON "artist"("name");

-- CreateIndex
CREATE INDEX "_GenreToSerie_B_index" ON "_GenreToSerie"("B");

-- CreateIndex
CREATE INDEX "_AuthorToSerie_B_index" ON "_AuthorToSerie"("B");

-- CreateIndex
CREATE INDEX "_ArtistToSerie_B_index" ON "_ArtistToSerie"("B");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie" ADD CONSTRAINT "serie_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_chapter" ADD CONSTRAINT "serie_chapter_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "serie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serie_chapter_data" ADD CONSTRAINT "serie_chapter_data_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "serie_chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToSerie" ADD CONSTRAINT "_GenreToSerie_A_fkey" FOREIGN KEY ("A") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToSerie" ADD CONSTRAINT "_GenreToSerie_B_fkey" FOREIGN KEY ("B") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorToSerie" ADD CONSTRAINT "_AuthorToSerie_A_fkey" FOREIGN KEY ("A") REFERENCES "author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorToSerie" ADD CONSTRAINT "_AuthorToSerie_B_fkey" FOREIGN KEY ("B") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArtistToSerie" ADD CONSTRAINT "_ArtistToSerie_A_fkey" FOREIGN KEY ("A") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArtistToSerie" ADD CONSTRAINT "_ArtistToSerie_B_fkey" FOREIGN KEY ("B") REFERENCES "serie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
