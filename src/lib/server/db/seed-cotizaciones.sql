-- Seed del módulo Cotizaciones: estados, transiciones y permisos por rol.
-- Correr después de la migración: psql $DATABASE_URL -f 03-seed-cotizaciones.sql

-- ============ ESTADOS ============
INSERT INTO "estados_cotizacion" ("nombre", "slug", "grupo", "orden", "color", "es_final") VALUES
	('Ingresada',       'ingresada',         'entrada',   1, 'info',      false),
	('Asignada',        'asignada',          'revision',  2, 'secondary', false),
	('En cotización',   'en_cotizacion',     'revision',  3, 'warning',   false),
	('Lista p/ enviar', 'lista_para_enviar', 'respuesta', 4, 'accent',    false),
	('Enviada',         'enviada',           'respuesta', 5, 'primary',   false),
	('Aprobada',        'aprobada',          'final',     6, 'success',   true),
	('Rechazada',       'rechazada',         'final',     7, 'error',     true)
ON CONFLICT (slug) DO UPDATE SET
	 nombre = EXCLUDED.nombre,
	 grupo = EXCLUDED.grupo,
	 orden = EXCLUDED.orden,
	 color = EXCLUDED.color,
	 es_final = EXCLUDED.es_final;

-- ============ TRANSICIONES (state machine, tipo 'cotizacion') ============
-- Se reutiliza la tabla transiciones_estado existente.
INSERT INTO "transiciones_estado" ("tipo", "estado_origen_id", "estado_destino_id", "requiere_rol")
SELECT 'cotizacion', o.id, d.id, NULL FROM "estados_cotizacion" o, "estados_cotizacion" d
WHERE (o.slug = 'ingresada'      AND d.slug = 'asignada')
   OR (o.slug = 'ingresada'      AND d.slug = 'rechazada')
   OR (o.slug = 'asignada'       AND d.slug = 'en_cotizacion')
   OR (o.slug = 'asignada'       AND d.slug = 'rechazada')
   OR (o.slug = 'en_cotizacion'  AND d.slug = 'lista_para_enviar')
   OR (o.slug = 'en_cotizacion'  AND d.slug = 'rechazada')
   OR (o.slug = 'lista_para_enviar' AND d.slug = 'enviada')
   OR (o.slug = 'lista_para_enviar' AND d.slug = 'rechazada')
   OR (o.slug = 'enviada'        AND d.slug = 'aprobada')
	OR (o.slug = 'enviada'        AND d.slug = 'rechazada')
ON CONFLICT (tipo, estado_origen_id, estado_destino_id) DO NOTHING;

-- ============ PERMISOS ============
INSERT INTO "permisos" ("accion", "modulo")
SELECT acciones.accion, 'cotizaciones'
FROM (VALUES
	('view'),
	('create'),
	('edit'),
	('delete'),
	('asignar'),
	('cotizar'),
	('enviar'),
	('aprobar'),
	('convertir')
) AS acciones(accion)
WHERE NOT EXISTS (
	SELECT 1 FROM "permisos" existente
	WHERE existente."modulo" = 'cotizaciones' AND existente."accion" = acciones.accion
);
-- (admin tiene bypass en can(); no necesita filas)

-- ============ PERMISOS POR ROL (ajustá a tus roles reales) ============
-- Atención al Cliente (ventas): carga, ve, envía, aprueba, convierte
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "roles" r, "permisos" p
WHERE r.nombre = 'ventas'
  AND p.modulo = 'cotizaciones'
	AND p.accion IN ('view', 'create', 'edit', 'enviar', 'aprobar', 'convertir')
	AND NOT EXISTS (
	  SELECT 1 FROM roles_permisos existente
	  WHERE existente.rol_id = r.id AND existente.permiso_id = p.id
	);

-- Oficina Técnica (tecnico): ve, cotiza
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "roles" r, "permisos" p
WHERE r.nombre = 'tecnico'
  AND p.modulo = 'cotizaciones'
	AND p.accion IN ('view', 'cotizar', 'asignar')
	AND NOT EXISTS (
	  SELECT 1 FROM roles_permisos existente
	  WHERE existente.rol_id = r.id AND existente.permiso_id = p.id
	);

-- Gerente (admin): ya tiene todo por bypass de can().
-- Si tenés un rol 'gerente' distinto de admin, descomentá:
-- INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
-- SELECT r.id, p.id FROM "roles" r, "permisos" p
-- WHERE r.nombre = 'gerente' AND p.modulo = 'cotizaciones';
