INSERT INTO permisos (accion, modulo)
SELECT permiso.accion, 'contactos'
FROM (VALUES ('view'), ('create'), ('edit'), ('delete')) AS permiso(accion)
WHERE NOT EXISTS (
	SELECT 1 FROM permisos existente
	WHERE existente.accion = permiso.accion AND existente.modulo = 'contactos'
);

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT rp.rol_id, nuevo.id
FROM roles_permisos rp
INNER JOIN permisos anterior ON anterior.id = rp.permiso_id AND anterior.modulo = 'clientes'
INNER JOIN permisos nuevo ON nuevo.modulo = 'contactos' AND nuevo.accion = anterior.accion
WHERE NOT EXISTS (
	SELECT 1 FROM roles_permisos existente
	WHERE existente.rol_id = rp.rol_id AND existente.permiso_id = nuevo.id
);