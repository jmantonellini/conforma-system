-- Unifica estados_cotizacion, estados_pedido y estados_fabricacion en una sola tabla `estados`
-- con columna `flujo`. Remapea todas las referencias (entidades, transiciones y logs) sin perder datos.
CREATE TABLE "estados" (
	"id" serial PRIMARY KEY NOT NULL,
	"flujo" text NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"grupo" text NOT NULL,
	"orden" integer NOT NULL,
	"color" text,
	"es_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_estados_flujo_slug" ON "estados" USING btree ("flujo","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_estados_flujo_nombre" ON "estados" USING btree ("flujo","nombre");--> statement-breakpoint
INSERT INTO "estados" ("flujo", "nombre", "slug", "grupo", "orden", "color", "es_final", "created_at")
SELECT 'cotizacion', nombre, slug, grupo, orden, color, COALESCE(es_final, false), created_at FROM "estados_cotizacion"
UNION ALL
SELECT 'pedido', nombre, slug, grupo, orden, color, COALESCE(es_final, false), created_at FROM "estados_pedido"
UNION ALL
SELECT 'fabricacion', nombre, slug, grupo, orden, color, COALESCE(es_final, false), created_at FROM "estados_fabricacion";
--> statement-breakpoint
CREATE TABLE "mapa_estados" AS
SELECT 'cotizacion'::text AS flujo, viejo.id AS viejo_id, nuevo.id AS nuevo_id
FROM "estados_cotizacion" viejo JOIN "estados" nuevo ON nuevo.flujo = 'cotizacion' AND nuevo.slug = viejo.slug
UNION ALL
SELECT 'pedido', viejo.id, nuevo.id
FROM "estados_pedido" viejo JOIN "estados" nuevo ON nuevo.flujo = 'pedido' AND nuevo.slug = viejo.slug
UNION ALL
SELECT 'fabricacion', viejo.id, nuevo.id
FROM "estados_fabricacion" viejo JOIN "estados" nuevo ON nuevo.flujo = 'fabricacion' AND nuevo.slug = viejo.slug;
--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP CONSTRAINT "cotizaciones_estado_id_estados_cotizacion_id_fk";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_estado_id_estados_pedido_id_fk";--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" DROP CONSTRAINT "unidades_fabricacion_estado_id_estados_fabricacion_id_fk";--> statement-breakpoint
UPDATE "cotizaciones" e SET estado_id = m.nuevo_id FROM "mapa_estados" m
WHERE m.flujo = 'cotizacion' AND m.viejo_id = e.estado_id;--> statement-breakpoint
UPDATE "pedidos" e SET estado_id = m.nuevo_id FROM "mapa_estados" m
WHERE m.flujo = 'pedido' AND m.viejo_id = e.estado_id;--> statement-breakpoint
UPDATE "unidades_fabricacion" e SET estado_id = m.nuevo_id FROM "mapa_estados" m
WHERE m.flujo = 'fabricacion' AND m.viejo_id = e.estado_id;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ALTER COLUMN "estado_nuevo_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "logs_cambios_estado" l SET
	estado_anterior_id = (SELECT nuevo_id FROM "mapa_estados" m WHERE m.viejo_id = l.estado_anterior_id
		AND m.flujo = CASE l.entidad_tipo WHEN 'unidad' THEN 'fabricacion' ELSE l.entidad_tipo END),
	estado_nuevo_id = (SELECT nuevo_id FROM "mapa_estados" m WHERE m.viejo_id = l.estado_nuevo_id
		AND m.flujo = CASE l.entidad_tipo WHEN 'unidad' THEN 'fabricacion' ELSE l.entidad_tipo END);
--> statement-breakpoint
DROP INDEX "idx_transicion_unica";--> statement-breakpoint
DELETE FROM "transiciones_estado" t WHERE NOT EXISTS (
	SELECT 1 FROM "mapa_estados" m WHERE m.flujo = t.tipo AND m.viejo_id = t.estado_origen_id
) OR NOT EXISTS (
	SELECT 1 FROM "mapa_estados" m WHERE m.flujo = t.tipo AND m.viejo_id = t.estado_destino_id
);--> statement-breakpoint
UPDATE "transiciones_estado" t SET
	estado_origen_id = (SELECT nuevo_id FROM "mapa_estados" m WHERE m.flujo = t.tipo AND m.viejo_id = t.estado_origen_id),
	estado_destino_id = (SELECT nuevo_id FROM "mapa_estados" m WHERE m.flujo = t.tipo AND m.viejo_id = t.estado_destino_id);
--> statement-breakpoint
ALTER TABLE "transiciones_estado" DROP COLUMN "tipo";--> statement-breakpoint
ALTER TABLE "transiciones_estado" DROP COLUMN "requiere_rol";--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" DROP COLUMN "historial_estados";--> statement-breakpoint
DROP TABLE "estados_cotizacion";--> statement-breakpoint
DROP TABLE "estados_fabricacion";--> statement-breakpoint
DROP TABLE "estados_pedido";--> statement-breakpoint
DROP TABLE "mapa_estados";--> statement-breakpoint
-- Estados y transiciones por defecto para bases nuevas (antes los cargaban los seeds en cada deploy).
INSERT INTO "estados" ("flujo", "nombre", "slug", "grupo", "orden", "color", "es_final")
SELECT d.* FROM (VALUES
	('cotizacion', 'Ingresada', 'ingresada', 'entrada', 1, 'info', false),
	('cotizacion', 'Asignada', 'asignada', 'revision', 2, 'secondary', false),
	('cotizacion', 'En cotización', 'en_cotizacion', 'revision', 3, 'warning', false),
	('cotizacion', 'Lista p/ enviar', 'lista_para_enviar', 'respuesta', 4, 'accent', false),
	('cotizacion', 'Enviada', 'enviada', 'respuesta', 5, 'primary', false),
	('cotizacion', 'Aprobada', 'aprobada', 'final', 6, 'success', true),
	('cotizacion', 'Rechazada', 'rechazada', 'final', 7, 'error', true),
	('pedido', 'Pendiente', 'pendiente', 'inicial', 0, 'warning', false),
	('pedido', 'En producción', 'en_produccion', 'proceso', 1, 'info', false),
	('pedido', 'Completado', 'completado', 'proceso', 2, 'success', false),
	('pedido', 'Entregado', 'entregado', 'final', 3, 'success', true),
	('pedido', 'Cancelado', 'cancelado', 'excepcion', 4, 'error', true),
	('pedido', 'Demorado', 'demorado', 'excepcion', 5, 'error', false),
	('fabricacion', 'Preparando material', 'preparando_material', 'preparacion', 1, 'warning', false),
	('fabricacion', 'En producción', 'en_produccion', 'activo', 2, 'info', false),
	('fabricacion', 'Limpieza', 'limpieza', 'activo', 3, 'info', false),
	('fabricacion', 'Terminado', 'terminado', 'final', 4, 'success', true),
	('fabricacion', 'Pausado', 'pausado', 'pausado', 5, 'error', false)
) AS d(flujo, nombre, slug, grupo, orden, color, es_final)
WHERE NOT EXISTS (SELECT 1 FROM "estados" e WHERE e.flujo = d.flujo);--> statement-breakpoint
INSERT INTO "transiciones_estado" ("estado_origen_id", "estado_destino_id")
SELECT o.id, d.id FROM (VALUES
	('cotizacion', 'ingresada', 'asignada'), ('cotizacion', 'ingresada', 'rechazada'),
	('cotizacion', 'asignada', 'en_cotizacion'), ('cotizacion', 'asignada', 'rechazada'),
	('cotizacion', 'en_cotizacion', 'lista_para_enviar'), ('cotizacion', 'en_cotizacion', 'rechazada'),
	('cotizacion', 'lista_para_enviar', 'enviada'), ('cotizacion', 'lista_para_enviar', 'rechazada'),
	('cotizacion', 'enviada', 'aprobada'), ('cotizacion', 'enviada', 'rechazada'),
	('cotizacion', 'aprobada', 'enviada'),
	('pedido', 'pendiente', 'en_produccion'), ('pedido', 'en_produccion', 'completado'),
	('pedido', 'completado', 'entregado'), ('pedido', 'pendiente', 'cancelado'),
	('pedido', 'en_produccion', 'demorado'), ('pedido', 'demorado', 'en_produccion'),
	('pedido', 'demorado', 'cancelado'), ('pedido', 'completado', 'en_produccion'),
	('pedido', 'entregado', 'completado'),
	('fabricacion', 'preparando_material', 'en_produccion'), ('fabricacion', 'en_produccion', 'limpieza'),
	('fabricacion', 'limpieza', 'terminado'), ('fabricacion', 'preparando_material', 'pausado'),
	('fabricacion', 'en_produccion', 'pausado'), ('fabricacion', 'limpieza', 'pausado'),
	('fabricacion', 'pausado', 'preparando_material'), ('fabricacion', 'pausado', 'en_produccion'),
	('fabricacion', 'pausado', 'limpieza'), ('fabricacion', 'en_produccion', 'preparando_material'),
	('fabricacion', 'limpieza', 'en_produccion'), ('fabricacion', 'terminado', 'limpieza')
) AS t(flujo, origen, destino)
JOIN "estados" o ON o.flujo = t.flujo AND o.slug = t.origen
JOIN "estados" d ON d.flujo = t.flujo AND d.slug = t.destino
WHERE NOT EXISTS (
	SELECT 1 FROM "transiciones_estado" x JOIN "estados" e ON e.id = x.estado_origen_id WHERE e.flujo = t.flujo
);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transicion_unica" ON "transiciones_estado" USING btree ("estado_origen_id","estado_destino_id");--> statement-breakpoint
ALTER TABLE "transiciones_estado" ADD CONSTRAINT "transiciones_estado_distintos" CHECK ("transiciones_estado"."estado_origen_id" <> "transiciones_estado"."estado_destino_id");--> statement-breakpoint
ALTER TABLE "transiciones_estado" ADD CONSTRAINT "transiciones_estado_estado_origen_id_estados_id_fk" FOREIGN KEY ("estado_origen_id") REFERENCES "public"."estados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transiciones_estado" ADD CONSTRAINT "transiciones_estado_estado_destino_id_estados_id_fk" FOREIGN KEY ("estado_destino_id") REFERENCES "public"."estados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_estado_id_estados_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado_id_estados_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_estado_id_estados_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados"("id") ON DELETE restrict ON UPDATE no action;
