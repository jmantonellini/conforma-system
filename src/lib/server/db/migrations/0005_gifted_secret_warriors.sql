CREATE TABLE "adjuntos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer,
	"pedido_id" integer,
	"orden_fabricacion_id" integer,
	"nombre_original" text NOT NULL,
	"archivo_key" text NOT NULL,
	"mime_type" text,
	"tamano_bytes" integer,
	"created_at" timestamp DEFAULT now(),
 	CONSTRAINT "adjuntos_un_solo_propietario" CHECK (num_nonnulls("cotizacion_id", "pedido_id", "orden_fabricacion_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_owner_cotizacion" ON "adjuntos" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX "idx_adjuntos_owner_pedido" ON "adjuntos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_adjuntos_owner_fabricacion" ON "adjuntos" USING btree ("orden_fabricacion_id");--> statement-breakpoint
INSERT INTO "adjuntos" ("cotizacion_id", "nombre_original", "archivo_key", "mime_type", "tamano_bytes", "created_at")
SELECT "cotizacion_id", "nombre_original", 'cotizaciones/' || regexp_replace("archivo_url", '^.*/', ''), "mime_type", "tamano_bytes", "created_at"
FROM "adjuntos_cotizacion";
--> statement-breakpoint
INSERT INTO "adjuntos" ("pedido_id", "nombre_original", "archivo_key", "mime_type", "tamano_bytes", "created_at")
SELECT "pedido_id", "nombre_original", 'pedidos/' || regexp_replace("archivo_key", '^.*/', ''), "mime_type", "tamano_bytes", "created_at"
FROM "adjuntos_pedido";
--> statement-breakpoint
INSERT INTO "adjuntos" ("orden_fabricacion_id", "nombre_original", "archivo_key", "mime_type", "tamano_bytes", "created_at")
SELECT "orden_fabricacion_id", "nombre_original", 'fabricacion/' || regexp_replace("archivo_key", '^.*/', ''), "mime_type", "tamano_bytes", "created_at"
FROM "adjuntos_fabricacion";
--> statement-breakpoint
DROP TABLE "adjuntos_cotizacion";
--> statement-breakpoint
DROP TABLE "adjuntos_pedido";
--> statement-breakpoint
DROP TABLE "adjuntos_fabricacion";