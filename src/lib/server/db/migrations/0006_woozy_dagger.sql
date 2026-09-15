CREATE TABLE "insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text DEFAULT 'material' NOT NULL,
	"unidad" text DEFAULT 'unidad' NOT NULL,
	"costo_unitario" real DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "insumos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "producto_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"insumo_id" integer NOT NULL,
	"cantidad" real DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"opcional" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "producto_insumos" ADD CONSTRAINT "producto_insumos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_insumos" ADD CONSTRAINT "producto_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_producto_insumos_producto" ON "producto_insumos" USING btree ("producto_id");