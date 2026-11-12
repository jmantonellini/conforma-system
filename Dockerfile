FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/build ./build
COPY src/lib/server/db/migrations ./src/lib/server/db/migrations
COPY src/lib/server/db/seed.sql ./src/lib/server/db/seed.sql
COPY scripts/migrar.mjs scripts/seed.mjs ./scripts/
EXPOSE 3000
CMD ["node", "build/index.js"]
