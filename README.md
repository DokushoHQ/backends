# Dokusho Backends

With the latest DMCA thingy in mangadex I needed a way to archive what I am reading without it being a manual chore I have to run manually every day.
That being said, this is for personal, and only for personal use. Do not use it to massively scrape every single source you know and massively download data please, we need those aggregator website to exist, same as translation group so consider donating to either or both of them. And more importantly supporting the official release of the manga you read by buying them when they are out in your country or even the japanese version, maybe.

This is a Nuxt 4 app because I wanted to try it out, and also because I hate myself apparently. First time doing serious backend work in Nuxt, so expect some questionable decisions.

PRs welcome - if your code works, manual test is passing and isn't a complete disaster, I'll test and merge it as soon as I humanly can.

## Features

- Multi-source scraping: MangaDex, WeebCentral, Suwayomi for the rest
- Search with MeiliSearch
- PostgreSQL for actual data storage
- S3 storage for covers and chapter pages
- Background job processing with BullMQ/Redis
- Dashboard for managing your library, should be plenty of functionality for personal use
- Auth with better-auth (password, OIDC, API keys)
- Soft delete with grace period (in case you mess up)

## Working On

- Better update scheduling, sometimes job are added again when scheduler is running again. I will pin an issue, do not hesitate to reply if you think you have a solution after reading the code

## Planned

- Test ?
- Maybe a REST API for third party clients, but you can already use the one in server/api/v1/serie for Mihon like source, I hope
- Mihon extension
- More sources, if I ever get around to it, otherwise suwayomi source should work fine for now I think
- Suwayomi extension management from dashboard
- IA/ML/Other, at some point I would like to implement image upscaling or even translation since I can say what I want it's just a plan with no date

## Running

### Development

```bash
# Start dependencies (postgres, redis, meilisearch, etc.)
docker compose up -d

# Run the app
pnpm dev                    # Server on http://localhost:3000
pnpm processor:dev          # Background workers (separate terminal)
```

### Production

The image supports three commands: `server` (default), `workers`, and `migrate`.

```yaml
# compose.prod.yml
services:
  dokusho:
    image: ghcr.io/dokushohq/dokusho-backends:latest
    container_name: dokusho-server
    command: server
    env_file: [.env]
    ports:
      - "3000:3000"
    depends_on:
      dokusho-migrate:
        condition: service_completed_successfully

  dokusho-workers:
    image: ghcr.io/dokushohq/dokusho-backends:latest
    container_name: dokusho-workers
    command: workers
    env_file: [.env]
    depends_on:
      dokusho-migrate:
        condition: service_completed_successfully

  dokusho-migrate:
    image: ghcr.io/dokushohq/dokusho-backends:latest
    container_name: dokusho-migrate
    command: migrate
    env_file: [.env]
```

Combine with `compose.yml` for the full stack:

```bash
docker compose -f compose.yml -f compose.prod.yml up -d
```

You'll need to set up your environment variables. Check `nuxt.config.ts` for what's expected, there is an .env.example file to get you started.

## Tech Stack

- Nuxt 4
- Prisma (PostgreSQL)
- BullMQ + Redis
- S3-compatible storage (MinIO, Cloudflare R2, whatever)
- better-auth

## AI

Yes I used claude code to implement this application. I am a senior backend developer so I did not just let it do its thing while watching YouTube but it did write every part of the dashboard itself as I don't want to write frontend code if I can avoid it. I did test it myself extensively, it does not mean everything is perfect but it is useable on normal sized screen.
As for the backend, I wrote the implementation of the weebcentral and mangadex source and all the typing around it, I also made the base of the worker code but claude code was used to add more feature to them. Prisma schema is from me too.

I am sorry if you don't like it, truly. But I am not sorry to say I don't have as much time as I would like to spend a month or two writing a fullstack app AND maintaining it nor do I want to spend every moment of my time when I have other hobbies and a ton of other things to do.

I am more than happy to replace AI written code by human written code, most notably on dashboard, as long as it's improving things and/or implementing feature. Not rewriting code for the sake of it.
