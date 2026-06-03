-- Roles
INSERT INTO roles (nombre, descripcion) VALUES 
('admin', 'Acceso total al sistema'),
('jefe_planta', 'Gestiona producción y equipos'),
('operario', 'Actualiza estados de fabricación'),
('oficina', 'Gestiona pedidos y clientes'),
('cliente', 'Solo ve sus pedidos');

-- Permisos
INSERT INTO permisos (nombre, modulo) VALUES 
('ver_ordenes', 'ordenes'),
('crear_ordenes', 'ordenes'),
('editar_ordenes', 'ordenes'),
('eliminar_ordenes', 'ordenes'),
('cambiar_estados', 'ordenes'),
('ver_fabricacion', 'fabricacion'),
('editar_fabricacion', 'fabricacion'),
('ver_usuarios', 'usuarios'),
('editar_usuarios', 'usuarios'),
('ver_reportes', 'reportes'),
('exportar_datos', 'reportes');

-- Asignar permisos a admin (todos)
INSERT INTO roles_permisos (rol_id, permiso_id) 
SELECT 1, id FROM permisos;

-- Estados de pedido
INSERT INTO estados_pedido (nombre, orden, color) VALUES 
('en_espera_seña', 1, '#FFC107'),
('señado', 2, '#17A2B8'),
('falta_pago', 3, '#FD7E14'),
('en_proceso', 4, '#007BFF'),
('listo_enviar', 5, '#28A745'),
('enviado', 6, '#6F42C1'),
('entregado', 7, '#20C997'),
('cancelado', 99, '#DC3545');

-- Estados de fabricación
INSERT INTO estados_fabricacion (nombre, orden) VALUES 
('pendiente', 1),
('en_corte', 2),
('en_curvado', 3),
('ensamblando', 4),
('soldando', 5),
('alistando', 6),
('listo', 7),
('entregado_a_planta', 8);