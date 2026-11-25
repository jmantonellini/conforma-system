ALTER TABLE "productos" ADD COLUMN "tipo_pieza" text;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "historico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD COLUMN "producto_id" integer;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_unidades_producto" ON "unidades_fabricacion" USING btree ("producto_id");