-- Seed del módulo Cotizaciones: permisos por rol.
-- Correr después de la migración: psql $DATABASE_URL -f 03-seed-cotizaciones.sql

-- Estados y transiciones viven en la migración 0013 y se administran desde Configuración.

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

-- Oficina técnica nueva: solo consulta cotizaciones, sin módulos de administración ni clientes.
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "roles" r, "permisos" p
WHERE r.nombre = 'oficina_tecnica'
  AND p.modulo = 'cotizaciones'
  AND p.accion = 'view'
ON CONFLICT DO NOTHING;

-- Gerente (admin): ya tiene todo por bypass de can().
-- Si tenés un rol 'gerente' distinto de admin, descomentá:
-- INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
-- SELECT r.id, p.id FROM "roles" r, "permisos" p
-- WHERE r.nombre = 'gerente' AND p.modulo = 'cotizaciones';
