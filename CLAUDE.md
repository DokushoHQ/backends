# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dokusho Backends is a Nuxt 4 application serving as the backend for a manga/manhwa aggregation platform. It scrapes manga sources (MangaDex, WeebCentral, Japscan, Suwayomi), stores series/chapters in PostgreSQL, and provides a dashboard for management.

## Commands

```bash
# Development
pnpm dev                    # Start dev server on http://localhost:3000
pnpm processor:dev          # Run background job processor (BullMQ workers)

# Building
pnpm build                  # Production build
pnpm preview                # Preview production build

# Code Quality
pnpm lint                   # Run Biome linter
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Format code with Biome
pnpm typecheck              # Run TypeScript type checking

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate:dev         # Create/apply dev migration
pnpm db:migrate             # Apply migrations (production)
pnpm db:studio              # Open Prisma Studio
```

## Architecture

### Source System (`server/utils/sources/`)

The `Source` interface in `core.ts` defines how manga sources work. Each source must implement:
- `fetchPopularSerie()`, `fetchLatestUpdates()`, `fetchSearchSerie()` - Discovery
- `fetchSerieDetail()`, `fetchSerieChapters()` - Metadata
- `fetchChapterData()` - Image/text pages
- `parseUrl()` - URL-to-ID resolution

Sources are created via `createSources()` in `server/utils/sources/index.ts`. Native scrapers (MangaDex, WeebCentral, Japscan) are always loaded; Suwayomi sources are added dynamically if `SUWAYOMI_URL` is configured.

### Job Queue System

Uses `nuxt-processor` (BullMQ wrapper) with Redis. Queues and workers are separate:
- **Queues** (`server/queues/*.ts`): Define job data schemas with Zod
- **Workers** (`server/workers/*.ts`): Process jobs

Key queues:
- `serie-inserter`: Imports/updates a serie from a source, spawns child jobs
- `chapter-data`: Fetches chapter pages, uploads to S3
- `cover-update`: Downloads and uploads cover images to S3
- `indexer`: Updates serie aggregated fields after source changes
- `update-scheduler`: Scheduled refresh of existing series
- `delete-serie`: Handles soft/hard deletion with delay

Job flow uses BullMQ's FlowProducer - `serie-inserter` creates child jobs (`chapter-data`, `cover-update`) with an `indexer` parent that runs after all children complete.

### Database (`prisma/schema/`)

Split across multiple files:
- `schema.prisma`: Generator/datasource config
- `serie.prisma`: Series, chapters, sources, metadata
- `auth.prisma`: Users, sessions, API keys (better-auth)

Key relationships:
- `Serie` has many `SerieSource` (one per source it's tracked on)
- `SerieSource` stores raw multi-language data; `Serie` stores resolved display values
- `Chapter` belongs to both `Serie` and `Source`

Prisma client outputs to `server/utils/generated/`. Access via `db` from `server/utils/db.ts`.

### Authentication (`server/utils/auth.ts`)

Uses `better-auth` with Prisma adapter. Supports:
- Optional password auth (`BETTER_AUTH_ENABLE_PASSWORD`)
- Generic OIDC (`OIDC_*` env vars)
- API keys with rate limiting

Helper functions: `requireAuth(event)`, `requireAdmin(event)`

### API Routes (`server/api/`)

- `/api/v1/serie/*` - Serie CRUD, chapters, refresh
- `/api/v1/sources/*` - Source listing, search, import
- `/api/v1/chapter/*` - Chapter data retrieval
- `/api/auth/*` - Authentication endpoints (better-auth)
- `/api/jobs/*` - Queue monitoring and job management
- `/api/dashboard/*` - Statistics

### Frontend (`app/`)

Dashboard built with Nuxt UI v4. Pages: `/series`, `/sources`, `/jobs`, `/users`, `/me`

## Key Patterns

### Multi-Language Fields

Source data uses `MultiLanguage` type (`Partial<Record<SourceLanguage, string[]>>`). The `resolveMultiLanguage()` helper picks the best value based on configured primary/fallback languages.

### Soft Deletion

Series have `soft_deleted_at` and `pending_delete_job_id`. Deletion flow:
1. Mark as soft-deleted, schedule delayed hard-delete job
2. User can restore before delay expires
3. Hard delete removes from DB and S3

### Cover/Image Handling

All external images (covers, chapter pages) are downloaded and uploaded to S3. Source URLs may expire; S3 URLs are stable. The `s3.ts` utility handles uploads via AWS SDK.
