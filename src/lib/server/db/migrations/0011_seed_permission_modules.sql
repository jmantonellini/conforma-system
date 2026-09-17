SELECT setval(
	pg_get_serial_sequence('permisos', 'id'),
	COALESCE((SELECT MAX(id) FROM permisos), 0),
	true
);

INSERT INTO permisos (accion, modulo)
SELECT permiso.accion, permiso.modulo
FROM (
	VALUES
		('view', 'cotizaciones'),
		('create', 'cotizaciones'),
		('edit', 'cotizaciones'),
		('delete', 'cotizaciones'),
		('asignar', 'cotizaciones'),
		('cotizar', 'cotizaciones'),
		('enviar', 'cotizaciones'),
		('aprobar', 'cotizaciones'),
		('convertir', 'cotizaciones'),
		('view', 'insumos'),
		('create', 'insumos'),
		('edit', 'insumos'),
		('delete', 'insumos'),
		('import', 'insumos'),
		('view', 'fabricacion'),
		('create', 'fabricacion'),
		('edit', 'fabricacion'),
		('delete', 'fabricacion')
) AS permiso(accion, modulo)
WHERE NOT EXISTS (
	SELECT 1
	FROM permisos existente
	WHERE existente.accion = permiso.accion
		AND existente.modulo = permiso.modulo
);

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT rp.rol_id, nuevo.id
FROM roles_permisos rp
INNER JOIN permisos anterior ON anterior.id = rp.permiso_id AND anterior.modulo = 'taller'
INNER JOIN permisos nuevo ON nuevo.modulo = 'fabricacion' AND nuevo.accion = anterior.accion
WHERE NOT EXISTS (
	SELECT 1
	FROM roles_permisos existente
	WHERE existente.rol_id = rp.rol_id AND existente.permiso_id = nuevo.id
);