ALTER TABLE "adjuntos" DROP CONSTRAINT "adjuntos_un_solo_propietario";--> statement-breakpoint
ALTER TABLE "adjuntos" ADD COLUMN "producto_id" integer;--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_owner_producto" ON "adjuntos" USING btree ("producto_id");--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_un_solo_propietario" CHECK (num_nonnulls(cotizacion_id, pedido_id, orden_fabricacion_id, producto_id) = 1);