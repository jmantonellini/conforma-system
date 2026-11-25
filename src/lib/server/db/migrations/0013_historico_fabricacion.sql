DROP INDEX "idx_unidades_empresa_numero";--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ALTER COLUMN "orden_fabricacion_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "historico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "historico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD COLUMN "contacto_id" integer;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD COLUMN "descripcion" text;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD COLUMN "fecha_fabricacion" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_unidades_contacto" ON "unidades_fabricacion" USING btree ("contacto_id");--> statement-breakpoint
CREATE INDEX "idx_unidades_empresa_numero" ON "unidades_fabricacion" USING btree ("empresa_id","numero");--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_con_orden_o_descripcion" CHECK ("unidades_fabricacion"."orden_fabricacion_id" IS NOT NULL OR "unidades_fabricacion"."descripcion" IS NOT NULL);--> statement-breakpoint
UPDATE "unidades_fabricacion" u SET "descripcion" = coalesce(u."descripcion", 'Unidad de la OF-' || u."orden_fabricacion_id" || ' (OF eliminada)'), "orden_fabricacion_id" = NULL WHERE u."orden_fabricacion_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ordenes_fabricacion" o WHERE o."id" = u."orden_fabricacion_id");--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint c
		JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
		WHERE c.conrelid = 'unidades_fabricacion'::regclass AND c.contype = 'f' AND a.attname = 'orden_fabricacion_id'
	) THEN
		ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
