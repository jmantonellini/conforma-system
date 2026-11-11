DELETE FROM "roles_permisos" rp
USING "permisos" p
WHERE rp."permiso_id" = p."id"
	AND p."modulo" = 'insumos'
	AND p."accion" = 'consumir';
--> statement-breakpoint
DELETE FROM "permisos"
WHERE "modulo" = 'insumos'
	AND "accion" = 'consumir';