CREATE TABLE "adjuntos_fabricacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_fabricacion_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"archivo_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "adjuntos_fabricacion" ADD CONSTRAINT "adjuntos_fabricacion_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_fabricacion_orden" ON "adjuntos_fabricacion" USING btree ("orden_fabricacion_id");