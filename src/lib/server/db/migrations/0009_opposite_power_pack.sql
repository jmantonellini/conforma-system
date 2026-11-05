ALTER TABLE "categorias_productos" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "categorias_productos"
SET "slug" = lower(regexp_replace(regexp_replace("nombre", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))
WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "categorias_productos" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias_productos" ADD CONSTRAINT "categorias_productos_slug_unique" UNIQUE("slug");