CREATE TABLE "producto_componentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"componente_id" integer NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "producto_componentes" ADD CONSTRAINT "producto_componentes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_componentes" ADD CONSTRAINT "producto_componentes_componente_id_productos_id_fk" FOREIGN KEY ("componente_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_producto_componentes_producto" ON "producto_componentes" USING btree ("producto_id");