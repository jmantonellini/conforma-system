ALTER TABLE "adjuntos" DROP CONSTRAINT "adjuntos_un_solo_propietario";--> statement-breakpoint
ALTER TABLE "adjuntos" ADD COLUMN "unidad_fabricacion_id" integer;--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_unidad_fabricacion_id_unidades_fabricacion_id_fk" FOREIGN KEY ("unidad_fabricacion_id") REFERENCES "public"."unidades_fabricacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_owner_unidad" ON "adjuntos" USING btree ("unidad_fabricacion_id");--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_un_solo_propietario" CHECK (num_nonnulls(cotizacion_id, pedido_id, orden_fabricacion_id, producto_id, unidad_fabricacion_id) = 1);