CREATE TABLE "movimientos_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"ubicacion_origen_id" integer,
	"ubicacion_destino_id" integer,
	"cantidad" integer NOT NULL,
	"tipo" text NOT NULL,
	"unidad_fabricacion_id" integer,
	"linea_pedido_id" integer,
	"usuario_id" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "movimientos_stock_cantidad_positiva" CHECK ("movimientos_stock"."cantidad" > 0),
	CONSTRAINT "movimientos_stock_ubicaciones_distintas" CHECK ("movimientos_stock"."ubicacion_origen_id" IS NULL OR "movimientos_stock"."ubicacion_destino_id" IS NULL OR "movimientos_stock"."ubicacion_origen_id" <> "movimientos_stock"."ubicacion_destino_id"),
	CONSTRAINT "movimientos_stock_requiere_ubicacion" CHECK ("movimientos_stock"."ubicacion_origen_id" IS NOT NULL OR "movimientos_stock"."ubicacion_destino_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "reservas_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"linea_pedido_id" integer NOT NULL,
	"ubicacion_stock_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"estado" text DEFAULT 'reservada' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "reservas_stock_linea_pedido_id_unique" UNIQUE("linea_pedido_id"),
	CONSTRAINT "reservas_stock_cantidad_positiva" CHECK ("reservas_stock"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "ubicaciones_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text NOT NULL,
	"contacto_distribuidor_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ubicaciones_stock_tipo_propietario" CHECK (("ubicaciones_stock"."tipo" = 'deposito' AND "ubicaciones_stock"."contacto_distribuidor_id" IS NULL) OR ("ubicaciones_stock"."tipo" = 'distribuidor' AND "ubicaciones_stock"."contacto_distribuidor_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "linea_pedido_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD COLUMN "producto_id" integer;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD COLUMN "es_para_stock" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_ubicacion_origen_id_ubicaciones_stock_id_fk" FOREIGN KEY ("ubicacion_origen_id") REFERENCES "public"."ubicaciones_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_ubicacion_destino_id_ubicaciones_stock_id_fk" FOREIGN KEY ("ubicacion_destino_id") REFERENCES "public"."ubicaciones_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_unidad_fabricacion_id_unidades_fabricacion_id_fk" FOREIGN KEY ("unidad_fabricacion_id") REFERENCES "public"."unidades_fabricacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_linea_pedido_id_lineas_pedido_id_fk" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas_stock" ADD CONSTRAINT "reservas_stock_linea_pedido_id_lineas_pedido_id_fk" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas_stock" ADD CONSTRAINT "reservas_stock_ubicacion_stock_id_ubicaciones_stock_id_fk" FOREIGN KEY ("ubicacion_stock_id") REFERENCES "public"."ubicaciones_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ADD CONSTRAINT "ubicaciones_stock_contacto_distribuidor_id_contactos_id_fk" FOREIGN KEY ("contacto_distribuidor_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_movimientos_stock_unidad" ON "movimientos_stock" USING btree ("unidad_fabricacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_movimientos_stock_linea_pedido_tipo" ON "movimientos_stock" USING btree ("linea_pedido_id","tipo") WHERE "movimientos_stock"."linea_pedido_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_movimientos_stock_producto" ON "movimientos_stock" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "idx_movimientos_stock_origen" ON "movimientos_stock" USING btree ("ubicacion_origen_id");--> statement-breakpoint
CREATE INDEX "idx_movimientos_stock_destino" ON "movimientos_stock" USING btree ("ubicacion_destino_id");--> statement-breakpoint
CREATE INDEX "idx_reservas_stock_ubicacion_estado" ON "reservas_stock" USING btree ("ubicacion_stock_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ubicaciones_stock_distribuidor" ON "ubicaciones_stock" USING btree ("contacto_distribuidor_id") WHERE "ubicaciones_stock"."contacto_distribuidor_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ubicaciones_stock_deposito" ON "ubicaciones_stock" USING btree ("tipo") WHERE "ubicaciones_stock"."tipo" = 'deposito';--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "ubicaciones_stock" ("tipo", "nombre") VALUES ('deposito', 'Depósito central') ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "permisos" ("accion", "modulo")
SELECT acciones.accion, 'stock'
FROM (VALUES ('view'), ('edit')) AS acciones(accion)
WHERE NOT EXISTS (
	SELECT 1 FROM "permisos" p WHERE p."modulo" = 'stock' AND p."accion" = acciones.accion
);
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id", "created_at")
SELECT existentes."rol_id", stock_permiso."id", now()
FROM "roles_permisos" existentes
INNER JOIN "permisos" permiso_producto ON permiso_producto."id" = existentes."permiso_id"
INNER JOIN "permisos" stock_permiso
	ON stock_permiso."modulo" = 'stock' AND stock_permiso."accion" = permiso_producto."accion"
WHERE permiso_producto."modulo" = 'productos'
	AND permiso_producto."accion" IN ('view', 'edit')
ON CONFLICT DO NOTHING;