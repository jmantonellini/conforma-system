ALTER TABLE "categorias_productos" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
UPDATE "categorias_productos"
SET "slug" = lower(regexp_replace(regexp_replace("nombre", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))
WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "categorias_productos" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'categorias_productos_slug_unique'
			AND conrelid = 'public.categorias_productos'::regclass
	) THEN
		ALTER TABLE "categorias_productos"
			ADD CONSTRAINT "categorias_productos_slug_unique" UNIQUE("slug");
	END IF;
END $$;