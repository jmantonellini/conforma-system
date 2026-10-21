CREATE TABLE "adjuntos_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"archivo_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "adjuntos_fabricacion" CASCADE;--> statement-breakpoint
ALTER TABLE "adjuntos_pedido" ADD CONSTRAINT "adjuntos_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_pedido" ON "adjuntos_pedido" USING btree ("pedido_id");