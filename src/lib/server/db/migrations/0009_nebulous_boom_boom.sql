ALTER TABLE "lineas_cotizacion" ADD COLUMN "insumo_id" integer;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD COLUMN "insumos_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE set null ON UPDATE no action;