CREATE TABLE "pedido_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"insumo_id" integer NOT NULL,
	"cantidad" real DEFAULT 1 NOT NULL,
	"unidad" text NOT NULL,
	"costo_unitario" real,
	"cotizacion_linea_id" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_cotizacion_linea_id_lineas_cotizacion_id_fk" FOREIGN KEY ("cotizacion_linea_id") REFERENCES "public"."lineas_cotizacion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pedido_insumos_pedido" ON "pedido_insumos" USING btree ("pedido_id");