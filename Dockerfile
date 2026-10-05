# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS prod-deps
RUN npm prune --omit=dev

FROM deps AS build
COPY . .
ARG SITE_URL=https://ponoc.tech
ENV SITE_URL=$SITE_URL
RUN npm run build

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
CMD ["node", "--import", "tsx", "server.ts"]
