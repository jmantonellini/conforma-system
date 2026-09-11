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
RUN pnpm install --frozen-lockfile
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src/lib/server/db/migrations ./src/lib/server/db/migrations
EXPOSE 3000
CMD ["sh", "-c", "pnpm run db:migrate && node build/index.js"]