ALTER TABLE "productos" ADD COLUMN "anio_desde" integer;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "anio_hasta" integer;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_anios_orden" CHECK ("productos"."anio_desde" IS NULL OR "productos"."anio_hasta" IS NULL OR "productos"."anio_desde" <= "productos"."anio_hasta");