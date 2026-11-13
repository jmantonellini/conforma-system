FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG SENTRY_RELEASE=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
RUN --mount=type=secret,id=sentry_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_token 2>/dev/null || true)" \
    SENTRY_RELEASE="$SENTRY_RELEASE" SENTRY_ORG="$SENTRY_ORG" SENTRY_PROJECT="$SENTRY_PROJECT" \
    pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
ARG SENTRY_RELEASE=""
ENV NODE_ENV=production \
    SENTRY_RELEASE=$SENTRY_RELEASE \
    PUBLIC_SENTRY_RELEASE=$SENTRY_RELEASE
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/build ./build
COPY src/lib/server/db/migrations ./src/lib/server/db/migrations
COPY src/lib/server/db/seed.sql ./src/lib/server/db/seed.sql
COPY scripts/migrar.mjs scripts/seed.mjs ./scripts/
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/salud >/dev/null || exit 1
CMD ["node", "build/index.js"]
