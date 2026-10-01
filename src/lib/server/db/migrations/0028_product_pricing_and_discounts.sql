ALTER TABLE "productos"
	ADD COLUMN IF NOT EXISTS "margen_porcentaje" real NOT NULL DEFAULT 0;
--> statement-breakpoint

ALTER TABLE "lineas_cotizacion"
	ADD COLUMN IF NOT EXISTS "precio_lista_unitario" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "margen_porcentaje" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "descuento_porcentaje" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "justificacion_descuento" text,
	ADD COLUMN IF NOT EXISTS "descuento_usuario_id" integer,
	ALTER COLUMN "costo_materiales" SET DEFAULT 0;
--> statement-breakpoint

UPDATE "lineas_cotizacion"
SET "precio_lista_unitario" = "precio_unitario"
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" > 0;
--> statement-breakpoint

UPDATE "lineas_cotizacion" SET "costo_materiales" = 0 WHERE "costo_materiales" IS NULL;
--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "costo_materiales" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "lineas_pedido"
	ADD COLUMN IF NOT EXISTS "precio_lista_unitario" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "margen_porcentaje" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "descuento_porcentaje" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "justificacion_descuento" text,
	ADD COLUMN IF NOT EXISTS "descuento_usuario_id" integer,
	ADD COLUMN IF NOT EXISTS "costo_materiales" real NOT NULL DEFAULT 0;
--> statement-breakpoint

UPDATE "lineas_pedido"
SET "precio_lista_unitario" = "precio_unitario"
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" > 0;
--> statement-breakpoint

ALTER TABLE "pedido_insumos"
	ADD COLUMN IF NOT EXISTS "precio_lista_unitario" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "precio_unitario" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "descuento_porcentaje" real NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "justificacion_descuento" text,
	ADD COLUMN IF NOT EXISTS "descuento_usuario_id" integer;
--> statement-breakpoint

UPDATE "pedido_insumos"
SET "precio_lista_unitario" = COALESCE("costo_unitario", 0),
	"precio_unitario" = COALESCE("costo_unitario", 0)
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" = 0;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion"
		ADD CONSTRAINT "lineas_cotizacion_descuento_usuario_id_usuarios_id_fk"
		FOREIGN KEY ("descuento_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_pedido"
		ADD CONSTRAINT "lineas_pedido_descuento_usuario_id_usuarios_id_fk"
		FOREIGN KEY ("descuento_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pedido_insumos"
		ADD CONSTRAINT "pedido_insumos_descuento_usuario_id_usuarios_id_fk"
		FOREIGN KEY ("descuento_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "productos"
		ADD CONSTRAINT "productos_margen_porcentaje_range"
		CHECK ("margen_porcentaje" >= 0 AND "margen_porcentaje" < 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion"
		ADD CONSTRAINT "lineas_cotizacion_descuento_range"
		CHECK ("descuento_porcentaje" >= 0 AND "descuento_porcentaje" < 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_pedido"
		ADD CONSTRAINT "lineas_pedido_descuento_range"
		CHECK ("descuento_porcentaje" >= 0 AND "descuento_porcentaje" < 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pedido_insumos"
		ADD CONSTRAINT "pedido_insumos_descuento_range"
		CHECK ("descuento_porcentaje" >= 0 AND "descuento_porcentaje" < 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion"
		ADD CONSTRAINT "lineas_cotizacion_descuento_reason"
		CHECK ("descuento_porcentaje" = 0 OR length(trim(coalesce("justificacion_descuento", ''))) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "lineas_pedido"
		ADD CONSTRAINT "lineas_pedido_descuento_reason"
		CHECK ("descuento_porcentaje" = 0 OR length(trim(coalesce("justificacion_descuento", ''))) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pedido_insumos"
		ADD CONSTRAINT "pedido_insumos_descuento_reason"
		CHECK ("descuento_porcentaje" = 0 OR length(trim(coalesce("justificacion_descuento", ''))) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

INSERT INTO "permisos" ("accion", "modulo")
SELECT permisos_nuevos.accion, permisos_nuevos.modulo
FROM (VALUES ('descuento', 'cotizaciones'), ('descuento', 'pedidos')) AS permisos_nuevos(accion, modulo)
WHERE NOT EXISTS (
	SELECT 1 FROM "permisos" existentes
	WHERE existentes.accion = permisos_nuevos.accion
		AND existentes.modulo = permisos_nuevos.modulo
);