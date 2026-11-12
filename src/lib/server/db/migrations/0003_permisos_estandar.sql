INSERT INTO "permisos" ("accion", "modulo")
SELECT d."accion", d."modulo"
FROM (VALUES
	('view', 'cotizaciones'), ('create', 'cotizaciones'), ('edit', 'cotizaciones'), ('delete', 'cotizaciones'),
	('view', 'pedidos'), ('create', 'pedidos'), ('edit', 'pedidos'), ('delete', 'pedidos'),
	('view', 'fabricacion'), ('create', 'fabricacion'), ('edit', 'fabricacion'), ('delete', 'fabricacion'),
	('view', 'envios'), ('create', 'envios'), ('edit', 'envios'), ('delete', 'envios'),
	('view', 'contactos'), ('create', 'contactos'), ('edit', 'contactos'), ('delete', 'contactos'),
	('view', 'productos'), ('create', 'productos'), ('edit', 'productos'), ('delete', 'productos'),
	('view', 'insumos'), ('create', 'insumos'), ('edit', 'insumos'), ('delete', 'insumos'),
	('view', 'stock'), ('edit', 'stock'),
	('view', 'importes'),
	('view', 'reportes'),
	('view', 'configuracion'), ('edit', 'configuracion')
) AS d("accion", "modulo")
WHERE NOT EXISTS (SELECT 1 FROM "permisos" p WHERE p."modulo" = d."modulo" AND p."accion" = d."accion");
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rp."rol_id", nuevo."id"
FROM "roles_permisos" rp
JOIN "permisos" viejo ON viejo."id" = rp."permiso_id"
JOIN (VALUES
	('cotizaciones', 'asignar', 'cotizaciones', 'edit'),
	('cotizaciones', 'cotizar', 'cotizaciones', 'edit'),
	('cotizaciones', 'enviar', 'cotizaciones', 'edit'),
	('cotizaciones', 'aprobar', 'cotizaciones', 'edit'),
	('cotizaciones', 'descuento', 'cotizaciones', 'edit'),
	('cotizaciones', 'convertir', 'pedidos', 'create'),
	('pedidos', 'descuento', 'pedidos', 'edit'),
	('insumos', 'import', 'insumos', 'create'),
	('usuarios', 'view', 'configuracion', 'view'),
	('usuarios', 'create', 'configuracion', 'edit'),
	('usuarios', 'edit', 'configuracion', 'edit'),
	('usuarios', 'delete', 'configuracion', 'edit')
) AS m("modulo_viejo", "accion_vieja", "modulo_nuevo", "accion_nueva")
	ON m."modulo_viejo" = viejo."modulo" AND m."accion_vieja" = viejo."accion"
JOIN "permisos" nuevo ON nuevo."modulo" = m."modulo_nuevo" AND nuevo."accion" = m."accion_nueva"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "permisos" p
WHERE NOT EXISTS (
	SELECT 1 FROM (VALUES
		('view', 'cotizaciones'), ('create', 'cotizaciones'), ('edit', 'cotizaciones'), ('delete', 'cotizaciones'),
		('view', 'pedidos'), ('create', 'pedidos'), ('edit', 'pedidos'), ('delete', 'pedidos'),
		('view', 'fabricacion'), ('create', 'fabricacion'), ('edit', 'fabricacion'), ('delete', 'fabricacion'),
		('view', 'envios'), ('create', 'envios'), ('edit', 'envios'), ('delete', 'envios'),
		('view', 'contactos'), ('create', 'contactos'), ('edit', 'contactos'), ('delete', 'contactos'),
		('view', 'productos'), ('create', 'productos'), ('edit', 'productos'), ('delete', 'productos'),
		('view', 'insumos'), ('create', 'insumos'), ('edit', 'insumos'), ('delete', 'insumos'),
		('view', 'stock'), ('edit', 'stock'),
		('view', 'importes'),
		('view', 'reportes'),
		('view', 'configuracion'), ('edit', 'configuracion')
	) AS d("accion", "modulo")
	WHERE d."modulo" = p."modulo" AND d."accion" = p."accion"
);
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rp."rol_id", original."id"
FROM "roles_permisos" rp
JOIN "permisos" p ON p."id" = rp."permiso_id"
JOIN "permisos" original ON original."modulo" = p."modulo" AND original."accion" = p."accion" AND original."id" < p."id"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "permisos" p
USING "permisos" duplicado
WHERE duplicado."modulo" = p."modulo" AND duplicado."accion" = p."accion" AND duplicado."id" < p."id";
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT DISTINCT rp."rol_id", ver."id"
FROM "roles_permisos" rp
JOIN "permisos" p ON p."id" = rp."permiso_id"
JOIN "permisos" ver ON ver."modulo" = p."modulo" AND ver."accion" = 'view'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_permisos_modulo_accion" ON "permisos" ("modulo", "accion");
