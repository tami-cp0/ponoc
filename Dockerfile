# syntax=docker/dockerfile:1

# Debian slim, not Alpine: package-lock.json carries the glibc builds of
# Next's SWC, Tailwind's oxide and lightningcss.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM deps AS build
COPY . .
# Baked into static pages (metadataBase, Open Graph URLs), so it's needed at build time.
ARG SITE_URL=https://ponoc.tech
ENV SITE_URL=$SITE_URL
RUN npm run build

# One-off job: docker run --rm -e DATABASE_URL=... <image built with --target migrate>
FROM build AS migrate
CMD ["npx", "drizzle-kit", "migrate"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --chown=node:node package.json tsconfig.json next.config.ts server.ts ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
# Node runs as PID 1 (no npm or cross-env wrapper) so SIGTERM reaches
# server.ts and live sessions drain before exit.
CMD ["node", "--import", "tsx", "server.ts"]
