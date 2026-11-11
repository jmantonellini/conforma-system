INSERT INTO "permisos" ("accion", "modulo")
SELECT 'view', 'importes'
WHERE NOT EXISTS (
	SELECT 1 FROM "permisos" WHERE "modulo" = 'importes' AND "accion" = 'view'
);
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permisos" p
WHERE p."modulo" = 'importes'
	AND p."accion" = 'view'
	AND r."nombre" NOT IN ('admin', 'oficina_tecnica')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "roles_permisos" rp
USING "permisos" p
WHERE rp."permiso_id" = p.id
	AND p."modulo" = 'clientes';
--> statement-breakpoint
DELETE FROM "permisos" WHERE "modulo" = 'clientes';