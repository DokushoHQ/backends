FROM node:25-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS build
RUN npm install -g --force corepack && corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm db:generate && pnpm build

FROM base AS runner
RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*
RUN npm install -g prisma@7.2.0
# Install prisma locally for migrate command (prisma.config.ts needs prisma/config module)
RUN npm install prisma@7.2.0

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["server"]
