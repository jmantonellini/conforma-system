# Conforma System

Sistema ERP full-stack para cotizaciones, contactos, productos, insumos, pedidos y fabricación. Está construido con SvelteKit 2, Svelte 5, TypeScript, PostgreSQL y Drizzle ORM. La aplicación de producción usa el adapter Node.

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker y Docker Compose para PostgreSQL local

## Desarrollo

1. Copiá `.env.example` a `.env` y ajustá las credenciales locales.
2. Instalá las dependencias y levantá PostgreSQL:

```sh
pnpm install
docker compose -f docker-compose.dev.yml up -d
```

3. Aplicá migraciones y datos iniciales:

```sh
pnpm db:migrate
pnpm db:seed
```

4. Iniciá la aplicación:

```sh
pnpm dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Base de datos

`DATABASE_URL` es usado por Drizzle Kit. La aplicación Node se conecta usando `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. Las migraciones SQL están en `src/lib/server/db/migrations`; `pnpm db:seed` carga los datos base y los del módulo de cotizaciones.

Para crear y aplicar cambios de esquema:

```sh
pnpm db:generate
pnpm db:migrate
```

## Calidad y pruebas

```sh
pnpm check
pnpm lint
pnpm exec vitest run
pnpm test:db
pnpm test:e2e
```

Las pruebas de base de datos y E2E usan `TEST_DATABASE_URL`. Debe apuntar a una base local dedicada cuyo nombre incluya `test`; el setup E2E rechaza hosts que no sean loopback.

## Producción

```sh
pnpm build
pnpm preview
```

La imagen Docker ejecuta las migraciones y luego inicia el servidor Node en el puerto 3000.
