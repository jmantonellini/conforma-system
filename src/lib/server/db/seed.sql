-- ============================================================
-- SEED COMPLETO — Migrado desde SQLite (backup-ULTIMO.sql)
-- ============================================================
-- Nota: Las columnas created_at/updated_at se convierten de INTEGER (epoch)
-- a TIMESTAMP. Los NULLs se mantienen.

-- ============================================================
-- ROLES (ya existentes en backup, diferentes IDs)
-- ============================================================

INSERT INTO roles (id, nombre, descripcion, created_at) VALUES
(1, 'operario', 'Consulta fabricación', NULL),
(2, 'ventas', 'Crea pedidos y gestiona clientes', NULL),
(3, 'tecnico', 'Gestiona productos y pedidos', NULL),
(4, 'admin', 'Acceso total', NULL),
(5, 'jefe_planta', 'Gestiona fabricación y pedidos', NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PERMISOS
-- ============================================================

INSERT INTO permisos (id, accion, modulo, created_at) VALUES
(1, 'view', 'clientes', NULL),
(2, 'create', 'clientes', NULL),
(3, 'edit', 'clientes', NULL),
(4, 'delete', 'clientes', NULL),
(5, 'view', 'productos', NULL),
(6, 'create', 'productos', NULL),
(7, 'edit', 'productos', NULL),
(8, 'delete', 'productos', NULL),
(9, 'view', 'pedidos', NULL),
(10, 'create', 'pedidos', NULL),
(11, 'edit', 'pedidos', NULL),
(12, 'delete', 'pedidos', NULL),
(13, 'view', 'taller', NULL),
(14, 'edit', 'taller', NULL),
(15, 'delete', 'taller', NULL),
(16, 'view', 'usuarios', NULL),
(17, 'create', 'usuarios', NULL),
(18, 'edit', 'usuarios', NULL),
(19, 'delete', 'usuarios', NULL),
(20, 'view', 'configuracion', NULL),
(21, 'edit', 'configuracion', NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ROLES_PERMISOS
-- ============================================================

INSERT INTO roles_permisos (rol_id, permiso_id, created_at) VALUES
(1, 13, NULL),
(4, 1, NULL), (4, 2, NULL), (4, 3, NULL), (4, 4, NULL), (4, 5, NULL),
(4, 6, NULL), (4, 7, NULL), (4, 8, NULL), (4, 9, NULL), (4, 10, NULL),
(4, 11, NULL), (4, 12, NULL), (4, 13, NULL), (4, 14, NULL), (4, 15, NULL),
(4, 16, NULL), (4, 17, NULL), (4, 18, NULL), (4, 19, NULL), (4, 20, NULL),
(4, 21, NULL),
(2, 1, to_timestamp(1781809268)), (2, 2, to_timestamp(1781809268)), (2, 3, to_timestamp(1781809268)),
(2, 5, to_timestamp(1781809268)), (2, 9, to_timestamp(1781809268)), (2, 10, to_timestamp(1781809268)),
(2, 11, to_timestamp(1781809268)), (2, 14, to_timestamp(1781809268)), (2, 15, to_timestamp(1781809268)),
(2, 6, to_timestamp(1781809268)), (2, 8, to_timestamp(1781809268)), (2, 7, to_timestamp(1781809268)),
(2, 12, to_timestamp(1781809268)), (2, 4, to_timestamp(1781809268)),
(3, 1, to_timestamp(1781809294)), (3, 5, to_timestamp(1781809294)), (3, 6, to_timestamp(1781809294)),
(3, 7, to_timestamp(1781809294)), (3, 8, to_timestamp(1781809294)), (3, 9, to_timestamp(1781809294)),
(3, 11, to_timestamp(1781809294)), (3, 14, to_timestamp(1781809294)), (3, 15, to_timestamp(1781809294)),
(3, 13, to_timestamp(1781809294)),
(5, 1, to_timestamp(1781809311)), (5, 5, to_timestamp(1781809311)), (5, 9, to_timestamp(1781809311)),
(5, 11, to_timestamp(1781809311)), (5, 13, to_timestamp(1781809311)), (5, 14, to_timestamp(1781809311)),
(5, 15, to_timestamp(1781809311))
ON CONFLICT DO NOTHING;


-- ============================================================
-- EMPLEADOS
-- ============================================================

INSERT INTO empleados (id, nombre, apellido, email, telefono, dni, direccion, fecha_ingreso, activo, created_at) VALUES
(1, 'Juan Manuel', 'Antonellini', NULL, '342423', '432424234', NULL, to_timestamp(1782432000), true, to_timestamp(1781806535)),
(2, 'Erica', 'Vallejos', NULL, NULL, NULL, NULL, NULL, true, to_timestamp(1781961138)),
(3, 'Romina', 'Porta', NULL, NULL, NULL, NULL, NULL, true, to_timestamp(1781961302)),
(4, 'Mauro', 'Tossoni', NULL, NULL, NULL, NULL, NULL, true, to_timestamp(1781964848)),
(5, 'Alejandro Mario', 'Antonellini', NULL, NULL, NULL, NULL, NULL, true, to_timestamp(1781964888))
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- USUARIOS
-- ============================================================

INSERT INTO usuarios (id, username, password_hash, rol_id, empleado_id, activo, ultimo_acceso, created_at) VALUES
(1, 'admin', '$2b$10$ZagFSe7xLEFVmWyZrmNeTe3WVwVeckKiwNyedjht0hmvOUryGf7M6', 4, 1, true, NULL, to_timestamp(1781022983))
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ESTADOS DE PEDIDO (del backup original)
-- ============================================================

INSERT INTO estados_pedido (id, nombre, slug, grupo, orden, color, es_final, created_at) VALUES
(1, 'Pendiente', 'pendiente', 'inicial', 0, 'warning', false, NULL),
(2, 'En producción', 'en_produccion', 'proceso', 1, 'info', false, NULL),
(3, 'Completado', 'completado', 'proceso', 2, 'success', false, NULL),
(4, 'Entregado', 'entregado', 'final', 3, 'success', true, NULL),
(5, 'Cancelado', 'cancelado', 'excepcion', 4, 'error', true, NULL),
(6, 'Demorado', 'demorado', 'excepcion', 5, 'error', false, NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ESTADOS DE FABRICACIÓN (del backup original)
-- ============================================================

INSERT INTO estados_fabricacion (id, nombre, slug, grupo, orden, color, es_final, created_at) VALUES
(1, 'Preparando material', 'preparando_material', 'preparacion', 1, 'warning', false, NULL),
(2, 'En producción', 'en_produccion', 'activo', 2, 'info', false, NULL),
(3, 'Limpieza', 'limpieza', 'activo', 3, 'info', false, NULL),
(4, 'Terminado', 'terminado', 'final', 4, 'success', true, NULL),
(5, 'Pausado', 'pausado', 'pausado', 5, 'error', false, NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TRANSICIONES DE ESTADO — FABRICACIÓN
-- ============================================================

INSERT INTO transiciones_estado (tipo, estado_origen_id, estado_destino_id, requiere_rol, created_at) VALUES
('fabricacion', 1, 2, 'operario', NOW()),
('fabricacion', 2, 3, 'operario', NOW()),
('fabricacion', 3, 4, 'operario', NOW()),
('fabricacion', 1, 5, 'operario', NOW()),
('fabricacion', 2, 5, 'operario', NOW()),
('fabricacion', 3, 5, 'operario', NOW()),
('fabricacion', 5, 1, 'operario', NOW()),
('fabricacion', 5, 2, 'operario', NOW()),
('fabricacion', 5, 3, 'operario', NOW()),
('fabricacion', 2, 1, 'jefe_planta', NOW()),
('fabricacion', 3, 2, 'jefe_planta', NOW()),
('fabricacion', 4, 3, 'jefe_planta', NOW())
ON CONFLICT (tipo, estado_origen_id, estado_destino_id) DO NOTHING;


-- ============================================================
-- TRANSICIONES DE ESTADO — PEDIDO
-- ============================================================

INSERT INTO transiciones_estado (tipo, estado_origen_id, estado_destino_id, requiere_rol, created_at) VALUES
('pedido', 1, 2, 'ventas', NOW()),
('pedido', 2, 3, 'ventas', NOW()),
('pedido', 3, 4, 'ventas', NOW()),
('pedido', 1, 5, 'ventas', NOW()),
('pedido', 2, 6, 'ventas', NOW()),
('pedido', 6, 2, 'ventas', NOW()),
('pedido', 6, 5, 'ventas', NOW()),
('pedido', 3, 2, 'admin', NOW()),
('pedido', 4, 3, 'admin', NOW())
ON CONFLICT (tipo, estado_origen_id, estado_destino_id) DO NOTHING;


-- ============================================================
-- CATEGORÍAS DE PRODUCTOS
-- ============================================================

INSERT INTO categorias_productos (id, nombre, descripcion, created_at) VALUES
(1, 'Escapes', 'Escapes', NULL),
(2, 'Industria', 'Industria', NULL),
(3, 'Arquitectura', 'Arquitectura', NULL),
(4, 'Otros', 'Otros', NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TIPOS DE VEHÍCULO
-- ============================================================

INSERT INTO tipos_vehiculo (id, nombre, slug, activo) VALUES
(1, 'Auto', 'auto', true),
(2, 'Moto', 'moto', true),
(3, 'Camioneta', 'camioneta', true),
(4, 'Avión', 'avion', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TIPOS DE USO
-- ============================================================

INSERT INTO tipos_uso (id, nombre, slug) VALUES
(1, 'Calle', 'calle'),
(2, 'Competición', 'competencia'),
(3, 'Colección', 'coleccion'),
(4, 'Otro', 'otro')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- MARCAS (90 registros)
-- ============================================================

INSERT INTO marcas (id, nombre, logo_url, activo) VALUES
(1, 'Ford', 'https://cdn.simpleicons.org/ford', true),
(2, 'Chevrolet', 'https://cdn.simpleicons.org/chevrolet', true),
(3, 'Honda', 'https://cdn.simpleicons.org/honda', true),
(4, 'Yamaha', '', true),
(5, 'BMW', 'https://cdn.simpleicons.org/bmw', true),
(6, 'Mercedes-Benz', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mercedes-benz-logo.svg', true),
(7, 'Volkswagen', 'https://cdn.simpleicons.org/volkswagen', true),
(8, 'Toyota', 'https://cdn.simpleicons.org/toyota', true),
(9, 'Nissan', 'https://cdn.simpleicons.org/nissan', true),
(10, 'Hyundai', 'https://cdn.simpleicons.org/hyundai', true),
(11, 'Kia', 'https://cdn.simpleicons.org/kia', true),
(12, 'Mazda', 'https://cdn.simpleicons.org/mazda', true),
(13, 'Subaru', 'https://cdn.simpleicons.org/subaru', true),
(14, 'Mitsubishi', 'https://cdn.simpleicons.org/mitsubishi', true),
(15, 'Suzuki', 'https://cdn.simpleicons.org/suzuki', true),
(16, 'Daihatsu', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/daihatsu-logo.svg', true),
(17, 'Isuzu', NULL, true),
(18, 'Lexus', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lexus-logo.png', true),
(19, 'Acura', 'https://cdn.simpleicons.org/acura', true),
(20, 'Infiniti', NULL, true),
(21, 'Audi', 'https://cdn.simpleicons.org/audi', true),
(22, 'Porsche', 'https://cdn.simpleicons.org/porsche', true),
(23, 'Volvo', 'https://cdn.simpleicons.org/volvo', true),
(24, 'Jaguar', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/jaguar-logo.svg', true),
(25, 'Land Rover', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/land-rover-logo.svg', true),
(26, 'Mini', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mini-logo.svg', true),
(27, 'Fiat', 'https://cdn.simpleicons.org/fiat', true),
(28, 'Peugeot', 'https://cdn.simpleicons.org/peugeot', true),
(29, 'Citroën', 'https://cdn.simpleicons.org/citroen', true),
(30, 'Renault', 'https://cdn.simpleicons.org/renault', true),
(31, 'Alfa Romeo', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/alfa-romeo-logo.svg', true),
(32, 'Lancia', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lancia-logo.png', true),
(33, 'Maserati', NULL, true),
(34, 'Ferrari', 'https://cdn.simpleicons.org/ferrari', true),
(35, 'Lamborghini', 'https://cdn.simpleicons.org/lamborghini', true),
(36, 'McLaren', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mclaren-logo.svg', true),
(37, 'Aston Martin', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/aston-martin-logo.svg', true),
(38, 'Bentley', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/bentley-logo.svg', true),
(39, 'Rolls-Royce', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/rolls-royce-logo.svg', true),
(40, 'Tesla', 'https://cdn.simpleicons.org/tesla', true),
(41, 'Rivian', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/rivian-logo.svg', true),
(42, 'Lucid', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lucid-logo.png', true),
(43, 'Polestar', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/polestar-logo.png', true),
(44, 'BYD', '', true),
(45, 'Geely', NULL, true),
(46, 'Great Wall', NULL, true),
(47, 'Chery', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/chery-logo.png', true),
(48, 'MG', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mg-logo.png', true),
(49, 'SEAT', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/seat-logo.svg', true),
(50, 'Skoda', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/skoda-logo.svg', true),
(51, 'Dodge', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/dodge-logo.png', true),
(52, 'Ram', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/ram-logo.svg', true),
(53, 'Jeep', 'https://cdn.simpleicons.org/jeep', true),
(54, 'Chrysler', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/chrysler-logo.svg', true),
(55, 'Buick', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/buick-logo.png', true),
(56, 'GMC', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/gmc-logo.png', true),
(57, 'Cadillac', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/cadillac-logo.png', true),
(58, 'Lincoln', 'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lincoln-logo.svg', true),
(59, 'Genesis', NULL, true),
(60, 'Kawasaki', '', true),
(61, 'Ducati', 'https://cdn.simpleicons.org/ducati', true),
(62, 'Triumph', '', true),
(63, 'Harley-Davidson', '', true),
(64, 'KTM', 'https://cdn.simpleicons.org/ktm', true),
(65, 'Husqvarna', NULL, true),
(66, 'Aprilia', '', true),
(67, 'Moto Guzzi', '', true),
(68, 'MV Agusta', NULL, true),
(69, 'Benelli', NULL, true),
(70, 'Royal Enfield', '', true),
(71, 'Bajaj', NULL, true),
(72, 'TVS', NULL, true),
(73, 'Hero', NULL, true),
(74, 'CFMoto', '', true),
(75, 'Bimota', NULL, true),
(76, 'Norton', NULL, true),
(77, 'Indian', NULL, true),
(78, 'Victory', NULL, true),
(79, 'Ural', NULL, true),
(80, 'Scania', NULL, true),
(81, 'Volvo Trucks', NULL, true),
(82, 'MAN', NULL, true),
(83, 'Iveco', NULL, true),
(84, 'DAF', NULL, true),
(85, 'Kenworth', NULL, true),
(86, 'Peterbilt', NULL, true),
(87, 'Freightliner', NULL, true),
(88, 'International', NULL, true),
(89, 'Mack', NULL, true),
(90, 'Western Star', NULL, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- MODELOS (322 registros)
-- ============================================================

INSERT INTO modelos (id, marca_id, tipo_vehiculo_id, nombre, anio_desde, anio_hasta, activo) VALUES
(1, 1, 1, 'Fiesta', NULL, NULL, true),
(2, 1, 1, 'Focus', NULL, NULL, true),
(3, 3, 2, 'CBR 600', NULL, NULL, true),
(4, 3, 2, 'CB 190', NULL, NULL, true),
(5, 4, 2, 'YZF-R6', NULL, NULL, true),
(6, 51, 1, 'Challenger', NULL, NULL, true),
(7, 51, 1, 'Charger', NULL, NULL, true),
(8, 51, 1, 'Durango', NULL, NULL, true),
(9, 51, 1, 'Ram', NULL, NULL, true),
(10, 1, 1, 'Fiesta', NULL, NULL, true),
(11, 1, 1, 'Focus', NULL, NULL, true),
(12, 1, 1, 'Mondeo', NULL, NULL, true),
(13, 1, 1, 'Mustang', NULL, NULL, true),
(14, 1, 1, 'Ranger', NULL, NULL, true),
(15, 1, 1, 'F-150', NULL, NULL, true),
(16, 1, 1, 'Explorer', NULL, NULL, true),
(17, 1, 1, 'Escape', NULL, NULL, true),
(18, 1, 1, 'Bronco', NULL, NULL, true),
(19, 1, 1, 'Maverick', NULL, NULL, true),
(20, 1, 1, 'Edge', NULL, NULL, true),
(21, 1, 1, 'Expedition', NULL, NULL, true),
(22, 1, 1, 'Transit', NULL, NULL, true),
(23, 1, 1, 'E-Transit', NULL, NULL, true),
(24, 1, 1, 'Mach-E', NULL, NULL, true),
(25, 1, 1, 'F-250', NULL, NULL, true),
(26, 1, 1, 'F-350', NULL, NULL, true),
(27, 1, 1, 'Taurus', NULL, NULL, true),
(28, 1, 1, 'Fusion', NULL, NULL, true),
(29, 2, 1, 'Onix', NULL, NULL, true),
(30, 2, 1, 'Prisma', NULL, NULL, true),
(31, 2, 1, 'Cruze', NULL, NULL, true),
(32, 2, 1, 'Cobalt', NULL, NULL, true),
(33, 2, 1, 'Camaro', NULL, NULL, true),
(34, 2, 1, 'Corvette', NULL, NULL, true),
(35, 2, 1, 'Silverado', NULL, NULL, true),
(36, 2, 1, 'Colorado', NULL, NULL, true),
(37, 2, 1, 'S-10', NULL, NULL, true),
(38, 2, 1, 'Blazer', NULL, NULL, true),
(39, 2, 1, 'Equinox', NULL, NULL, true),
(40, 2, 1, 'Traverse', NULL, NULL, true),
(41, 2, 1, 'Tahoe', NULL, NULL, true),
(42, 2, 1, 'Suburban', NULL, NULL, true),
(43, 2, 1, 'Trailblazer', NULL, NULL, true),
(44, 2, 1, 'Spark', NULL, NULL, true),
(45, 2, 1, 'Impala', NULL, NULL, true),
(46, 2, 1, 'Malibu', NULL, NULL, true),
(47, 7, 1, 'Gol', NULL, NULL, true),
(48, 7, 1, 'Fox', NULL, NULL, true),
(49, 7, 1, 'Voyage', NULL, NULL, true),
(50, 7, 1, 'Saveiro', NULL, NULL, true),
(51, 7, 1, 'Amarok', NULL, NULL, true),
(52, 7, 1, 'Golf', NULL, NULL, true),
(53, 7, 1, 'Jetta', NULL, NULL, true),
(54, 7, 1, 'Passat', NULL, NULL, true),
(55, 7, 1, 'Tiguan', NULL, NULL, true),
(56, 7, 1, 'Taos', NULL, NULL, true),
(57, 7, 1, 'Nivus', NULL, NULL, true),
(58, 7, 1, 'T-Cross', NULL, NULL, true),
(59, 7, 1, 'ID.4', NULL, NULL, true),
(60, 7, 1, 'Vento', NULL, NULL, true),
(61, 7, 1, 'Polo', NULL, NULL, true),
(62, 7, 1, 'Virtus', NULL, NULL, true),
(63, 7, 1, 'Touareg', NULL, NULL, true),
(64, 8, 1, 'Corolla', NULL, NULL, true),
(65, 8, 1, 'Camry', NULL, NULL, true),
(66, 8, 1, 'Hilux', NULL, NULL, true),
(67, 8, 1, 'SW4', NULL, NULL, true),
(68, 8, 1, 'RAV4', NULL, NULL, true),
(69, 8, 1, 'Yaris', NULL, NULL, true),
(70, 8, 1, 'Etios', NULL, NULL, true),
(71, 8, 1, 'Prius', NULL, NULL, true),
(72, 8, 1, 'Highlander', NULL, NULL, true),
(73, 8, 1, 'Land Cruiser', NULL, NULL, true),
(74, 8, 1, 'Supra', NULL, NULL, true),
(75, 8, 1, 'GR86', NULL, NULL, true),
(76, 8, 1, 'Sienna', NULL, NULL, true),
(77, 8, 1, 'Tundra', NULL, NULL, true),
(78, 8, 1, 'Tacoma', NULL, NULL, true),
(79, 3, 1, 'Civic', NULL, NULL, true),
(80, 3, 1, 'Accord', NULL, NULL, true),
(81, 3, 1, 'Fit', NULL, NULL, true),
(82, 3, 1, 'City', NULL, NULL, true),
(83, 3, 1, 'HR-V', NULL, NULL, true),
(84, 3, 1, 'CR-V', NULL, NULL, true),
(85, 3, 1, 'Pilot', NULL, NULL, true),
(86, 3, 1, 'Passport', NULL, NULL, true),
(87, 3, 1, 'Ridgeline', NULL, NULL, true),
(88, 3, 1, 'Odyssey', NULL, NULL, true),
(89, 3, 1, 'NSX', NULL, NULL, true),
(90, 9, 1, 'Sentra', NULL, NULL, true),
(91, 9, 1, 'Versa', NULL, NULL, true),
(92, 9, 1, 'Altima', NULL, NULL, true),
(93, 9, 1, 'Kicks', NULL, NULL, true),
(94, 9, 1, 'Rogue', NULL, NULL, true),
(95, 9, 1, 'Pathfinder', NULL, NULL, true),
(96, 9, 1, 'Frontier', NULL, NULL, true),
(97, 9, 1, 'Titan', NULL, NULL, true),
(98, 9, 1, '370Z', NULL, NULL, true),
(99, 9, 1, 'GT-R', NULL, NULL, true),
(100, 9, 1, 'Leaf', NULL, NULL, true),
(101, 9, 1, 'Armada', NULL, NULL, true),
(102, 10, 1, 'HB20', NULL, NULL, true),
(103, 10, 1, 'Creta', NULL, NULL, true),
(104, 10, 1, 'Tucson', NULL, NULL, true),
(105, 10, 1, 'Santa Fe', NULL, NULL, true),
(106, 10, 1, 'Palisade', NULL, NULL, true),
(107, 10, 1, 'Elantra', NULL, NULL, true),
(108, 10, 1, 'Sonata', NULL, NULL, true),
(109, 10, 1, 'Kona', NULL, NULL, true),
(110, 10, 1, 'Ioniq', NULL, NULL, true),
(111, 10, 1, 'Accent', NULL, NULL, true),
(112, 11, 1, 'Picanto', NULL, NULL, true),
(113, 11, 1, 'Rio', NULL, NULL, true),
(114, 11, 1, 'Cerato', NULL, NULL, true),
(115, 11, 1, 'Sportage', NULL, NULL, true),
(116, 11, 1, 'Sorento', NULL, NULL, true),
(117, 11, 1, 'Telluride', NULL, NULL, true),
(118, 11, 1, 'Stinger', NULL, NULL, true),
(119, 11, 1, 'EV6', NULL, NULL, true),
(120, 11, 1, 'Niro', NULL, NULL, true),
(121, 21, 1, 'A3', NULL, NULL, true),
(122, 21, 1, 'A4', NULL, NULL, true),
(123, 21, 1, 'A5', NULL, NULL, true),
(124, 21, 1, 'A6', NULL, NULL, true),
(125, 21, 1, 'A8', NULL, NULL, true),
(126, 21, 1, 'Q3', NULL, NULL, true),
(127, 21, 1, 'Q5', NULL, NULL, true),
(128, 21, 1, 'Q7', NULL, NULL, true),
(129, 21, 1, 'Q8', NULL, NULL, true),
(130, 21, 1, 'e-tron', NULL, NULL, true),
(131, 21, 1, 'TT', NULL, NULL, true),
(132, 21, 1, 'R8', NULL, NULL, true),
(133, 5, 1, 'Serie 1', NULL, NULL, true),
(134, 5, 1, 'Serie 3', NULL, NULL, true),
(135, 5, 1, 'Serie 5', NULL, NULL, true),
(136, 5, 1, 'Serie 7', NULL, NULL, true),
(137, 5, 1, 'X1', NULL, NULL, true),
(138, 5, 1, 'X3', NULL, NULL, true),
(139, 5, 1, 'X5', NULL, NULL, true),
(140, 5, 1, 'X7', NULL, NULL, true),
(141, 5, 1, 'i3', NULL, NULL, true),
(142, 5, 1, 'i4', NULL, NULL, true),
(143, 5, 1, 'iX', NULL, NULL, true),
(144, 5, 1, 'M3', NULL, NULL, true),
(145, 5, 1, 'M4', NULL, NULL, true),
(146, 5, 1, 'M5', NULL, NULL, true),
(147, 5, 1, 'M8', NULL, NULL, true),
(148, 6, 1, 'Clase A', NULL, NULL, true),
(149, 6, 1, 'Clase B', NULL, NULL, true),
(150, 6, 1, 'Clase C', NULL, NULL, true),
(151, 6, 1, 'Clase E', NULL, NULL, true),
(152, 6, 1, 'Clase S', NULL, NULL, true),
(153, 6, 1, 'Clase G', NULL, NULL, true),
(154, 6, 1, 'GLA', NULL, NULL, true),
(155, 6, 1, 'GLC', NULL, NULL, true),
(156, 6, 1, 'GLE', NULL, NULL, true),
(157, 6, 1, 'GLS', NULL, NULL, true),
(158, 6, 1, 'EQS', NULL, NULL, true),
(159, 6, 1, 'EQE', NULL, NULL, true),
(160, 6, 1, 'AMG GT', NULL, NULL, true),
(161, 6, 1, 'Sprinter', NULL, NULL, true),
(162, 27, 1, 'Cronos', NULL, NULL, true),
(163, 27, 1, 'Argo', NULL, NULL, true),
(164, 27, 1, 'Mobi', NULL, NULL, true),
(165, 27, 1, 'Pulse', NULL, NULL, true),
(166, 27, 1, 'Fastback', NULL, NULL, true),
(167, 27, 1, 'Strada', NULL, NULL, true),
(168, 27, 1, 'Toro', NULL, NULL, true),
(169, 27, 1, 'Uno', NULL, NULL, true),
(170, 27, 1, 'Punto', NULL, NULL, true),
(171, 27, 1, 'Palio', NULL, NULL, true),
(172, 27, 1, '500', NULL, NULL, true),
(173, 27, 1, '500X', NULL, NULL, true),
(174, 30, 1, 'Kwid', NULL, NULL, true),
(175, 30, 1, 'Sandero', NULL, NULL, true),
(176, 30, 1, 'Logan', NULL, NULL, true),
(177, 30, 1, 'Stepway', NULL, NULL, true),
(178, 30, 1, 'Duster', NULL, NULL, true),
(179, 30, 1, 'Oroch', NULL, NULL, true),
(180, 30, 1, 'Kangoo', NULL, NULL, true),
(181, 30, 1, 'Megane', NULL, NULL, true),
(182, 30, 1, 'Clio', NULL, NULL, true),
(183, 30, 1, 'Captur', NULL, NULL, true),
(184, 28, 1, '208', NULL, NULL, true),
(185, 28, 1, '2008', NULL, NULL, true),
(186, 28, 1, '308', NULL, NULL, true),
(187, 28, 1, '3008', NULL, NULL, true),
(188, 28, 1, '408', NULL, NULL, true),
(189, 28, 1, '508', NULL, NULL, true),
(190, 28, 1, '5008', NULL, NULL, true),
(191, 28, 1, 'Partner', NULL, NULL, true),
(192, 28, 1, 'Expert', NULL, NULL, true),
(193, 29, 1, 'C3', NULL, NULL, true),
(194, 29, 1, 'C3 Aircross', NULL, NULL, true),
(195, 29, 1, 'C4', NULL, NULL, true),
(196, 29, 1, 'C4 Cactus', NULL, NULL, true),
(197, 29, 1, 'Berlingo', NULL, NULL, true),
(198, 29, 1, 'Jumpy', NULL, NULL, true),
(199, 53, 1, 'Renegade', NULL, NULL, true),
(200, 53, 1, 'Compass', NULL, NULL, true),
(201, 53, 1, 'Wrangler', NULL, NULL, true),
(202, 53, 1, 'Gladiator', NULL, NULL, true),
(203, 53, 1, 'Cherokee', NULL, NULL, true),
(204, 53, 1, 'Grand Cherokee', NULL, NULL, true),
(205, 53, 1, 'Commander', NULL, NULL, true),
(206, 51, 1, 'Challenger', NULL, NULL, true),
(207, 51, 1, 'Charger', NULL, NULL, true),
(208, 51, 1, 'Durango', NULL, NULL, true),
(209, 51, 1, 'Ram', NULL, NULL, true),
(210, 3, 2, 'CBR 600', NULL, NULL, true),
(211, 3, 2, 'CBR 1000', NULL, NULL, true),
(212, 3, 2, 'CB 500', NULL, NULL, true),
(213, 3, 2, 'CB 650', NULL, NULL, true),
(214, 3, 2, 'Africa Twin', NULL, NULL, true),
(215, 3, 2, 'XR 150', NULL, NULL, true),
(216, 3, 2, 'Tornado', NULL, NULL, true),
(217, 3, 2, 'CG 125', NULL, NULL, true),
(218, 3, 2, 'Fury', NULL, NULL, true),
(219, 3, 2, 'CBF 250', NULL, NULL, true),
(220, 4, 2, 'YZF-R3', NULL, NULL, true),
(221, 4, 2, 'YZF-R6', NULL, NULL, true),
(222, 4, 2, 'YZF-R1', NULL, NULL, true),
(223, 4, 2, 'MT-03', NULL, NULL, true),
(224, 4, 2, 'MT-07', NULL, NULL, true),
(225, 4, 2, 'MT-09', NULL, NULL, true),
(226, 4, 2, 'Ténéré 700', NULL, NULL, true),
(227, 4, 2, 'XTZ 250', NULL, NULL, true),
(228, 4, 2, 'WR 250', NULL, NULL, true),
(229, 4, 2, 'Neos', NULL, NULL, true),
(230, 4, 2, 'YZF-S', NULL, NULL, true),
(231, 60, 2, 'Ninja 400', NULL, NULL, true),
(232, 60, 2, 'Ninja 650', NULL, NULL, true),
(233, 60, 2, 'Ninja 1000', NULL, NULL, true),
(234, 60, 2, 'Z400', NULL, NULL, true),
(235, 60, 2, 'Z650', NULL, NULL, true),
(236, 60, 2, 'Z900', NULL, NULL, true),
(237, 60, 2, 'Versys 650', NULL, NULL, true),
(238, 60, 2, 'Versys 1000', NULL, NULL, true),
(239, 60, 2, 'KLR 650', NULL, NULL, true),
(240, 60, 2, 'Vulcan 650', NULL, NULL, true),
(241, 15, 2, 'GSX-R600', NULL, NULL, true),
(242, 15, 2, 'GSX-R750', NULL, NULL, true),
(243, 15, 2, 'GSX-R1000', NULL, NULL, true),
(244, 15, 2, 'SV650', NULL, NULL, true),
(245, 15, 2, 'V-Strom 650', NULL, NULL, true),
(246, 15, 2, 'V-Strom 1000', NULL, NULL, true),
(247, 15, 2, 'DRZ 400', NULL, NULL, true),
(248, 15, 2, 'GW 250', NULL, NULL, true),
(249, 15, 2, 'GSX-S 750', NULL, NULL, true),
(250, 61, 2, 'Panigale V2', NULL, NULL, true),
(251, 61, 2, 'Panigale V4', NULL, NULL, true),
(252, 61, 2, 'Streetfighter V2', NULL, NULL, true),
(253, 61, 2, 'Streetfighter V4', NULL, NULL, true),
(254, 61, 2, 'Monster', NULL, NULL, true),
(255, 61, 2, 'Scrambler', NULL, NULL, true),
(256, 61, 2, 'Diavel', NULL, NULL, true),
(257, 61, 2, 'Multistrada', NULL, NULL, true),
(258, 61, 2, 'Hypermotard', NULL, NULL, true),
(259, 61, 2, 'Supersport', NULL, NULL, true),
(260, 62, 2, 'Bonneville', NULL, NULL, true),
(261, 62, 2, 'Street Twin', NULL, NULL, true),
(262, 62, 2, 'Speed Twin', NULL, NULL, true),
(263, 62, 2, 'Scrambler 900', NULL, NULL, true),
(264, 62, 2, 'Scrambler 1200', NULL, NULL, true),
(265, 62, 2, 'Tiger 660', NULL, NULL, true),
(266, 62, 2, 'Tiger 900', NULL, NULL, true),
(267, 62, 2, 'Tiger 1200', NULL, NULL, true),
(268, 62, 2, 'Street Triple', NULL, NULL, true),
(269, 62, 2, 'Speed Triple', NULL, NULL, true),
(270, 63, 2, 'Sportster 883', NULL, NULL, true),
(271, 63, 2, 'Sportster 1200', NULL, NULL, true),
(272, 63, 2, 'Iron 883', NULL, NULL, true),
(273, 63, 2, 'Iron 1200', NULL, NULL, true),
(274, 63, 2, 'Softail Standard', NULL, NULL, true),
(275, 63, 2, 'Softail Fat Boy', NULL, NULL, true),
(276, 63, 2, 'Street Bob', NULL, NULL, true),
(277, 63, 2, 'Road King', NULL, NULL, true),
(278, 63, 2, 'Road Glide', NULL, NULL, true),
(279, 63, 2, 'Street Glide', NULL, NULL, true),
(280, 63, 2, 'Pan America', NULL, NULL, true),
(281, 63, 2, 'LiveWire', NULL, NULL, true),
(282, 64, 2, 'Duke 125', NULL, NULL, true),
(283, 64, 2, 'Duke 200', NULL, NULL, true),
(284, 64, 2, 'Duke 390', NULL, NULL, true),
(285, 64, 2, 'Duke 690', NULL, NULL, true),
(286, 64, 2, 'Duke 890', NULL, NULL, true),
(287, 64, 2, 'RC 200', NULL, NULL, true),
(288, 64, 2, 'RC 390', NULL, NULL, true),
(289, 64, 2, 'Adventure 390', NULL, NULL, true),
(290, 64, 2, 'Adventure 790', NULL, NULL, true),
(291, 64, 2, 'Adventure 890', NULL, NULL, true),
(292, 64, 2, 'EXC 450', NULL, NULL, true),
(293, 64, 2, 'SX-F 250', NULL, NULL, true),
(294, 64, 2, 'SX-F 450', NULL, NULL, true),
(295, 66, 2, 'RS 125', NULL, NULL, true),
(296, 66, 2, 'RS 250', NULL, NULL, true),
(297, 66, 2, 'RS 660', NULL, NULL, true),
(298, 66, 2, 'RSV4', NULL, NULL, true),
(299, 66, 2, 'Tuono 125', NULL, NULL, true),
(300, 66, 2, 'Tuono 660', NULL, NULL, true),
(301, 66, 2, 'Tuono V4', NULL, NULL, true),
(302, 66, 2, 'Shiver 900', NULL, NULL, true),
(303, 66, 2, 'Dorsoduro', NULL, NULL, true),
(304, 67, 2, 'V7', NULL, NULL, true),
(305, 67, 2, 'V9', NULL, NULL, true),
(306, 67, 2, 'V85 TT', NULL, NULL, true),
(307, 67, 2, 'Mandello', NULL, NULL, true),
(308, 70, 2, 'Classic 350', NULL, NULL, true),
(309, 70, 2, 'Bullet 350', NULL, NULL, true),
(310, 70, 2, 'Meteor 350', NULL, NULL, true),
(311, 70, 2, 'Interceptor 650', NULL, NULL, true),
(312, 70, 2, 'Continental GT 650', NULL, NULL, true),
(313, 70, 2, 'Himalayan', NULL, NULL, true),
(314, 70, 2, 'Scram 411', NULL, NULL, true),
(315, 74, 2, 'NK 300', NULL, NULL, true),
(316, 74, 2, 'NK 650', NULL, NULL, true),
(317, 74, 2, 'NK 800', NULL, NULL, true),
(318, 74, 2, 'SR 300', NULL, NULL, true),
(319, 74, 2, 'SR 450', NULL, NULL, true),
(320, 74, 2, 'MT 450', NULL, NULL, true),
(321, 74, 2, 'MT 650', NULL, NULL, true),
(322, 74, 2, 'CL-X 700', NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- CATEGORÍAS COMPETENCIA
-- ============================================================

INSERT INTO categorias_competencia (id, nombre, descripcion, tipo_vehiculo_id, activa_desde, activa_hasta, vigente) VALUES
(1, 'TC 2000', 'TC 2000', 1, NULL, NULL, true),
(2, 'TC', 'Turismo Carretera', 1, NULL, NULL, true),
(3, 'GP', 'Moto GP', 2, NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PRODUCTOS
-- ============================================================

INSERT INTO productos (id, codigo, nombre, categoria_id, medidas_primario_diametro, medidas_primario_largo, medidas_secundario_diametro, medidas_secundario_largo, trombon_diametro_inicial, trombon_largo, trombon_observaciones, tipo_vehiculo_id, marca_id, modelo_id, tipo_uso_id, categoria_competencia_id, precio_base, es_personalizable, activo, created_at, updated_at) VALUES
(14, 'TC001', 'Escape completo Ford Mustang', 1, 44, 600, 63, 350, 65, 750, 'Completo', 1, 1, 1, 2, 2, 2300, false, true, to_timestamp(1782143562), to_timestamp(1782143562)),
(15, 'TC002', 'Escape completo Chevrolet Camaro TC', 1, 48, 600, 63, 500, 68, 750, '', 1, 2, 34, 2, NULL, 2300, false, true, to_timestamp(1782734277), to_timestamp(1783475361)),
(16, '4214', 'Escape Ford Mustang 2026', 1, 23, 42, 12, 42, 12, 53, '', 1, 1, 13, 3, NULL, 420, false, true, to_timestamp(1783522037), to_timestamp(1783522037)),
(17, '2422', 'Escape Completo Amarok', 1, 20, 32, 42, 54, 23, 42, '', 1, 7, 51, 1, NULL, 1200, false, true, to_timestamp(1783943308), to_timestamp(1783943308)),
(18, '5353', 'Parrilla 40x60', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 500, false, true, to_timestamp(1783943871), to_timestamp(1783943871)),
(19, '5545', 'Bicicletero 4 lugares', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 600, false, true, to_timestamp(1783943952), to_timestamp(1783943952)),
(20, '234234', 'Escape completo Mustang', 1, 23, 43, 23, 43, 12, 32, '', 1, 7, 51, 2, 1, 1200, false, true, to_timestamp(1783945058), to_timestamp(1783945058))
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- CLIENTES
-- ============================================================

INSERT INTO clientes (id, nombre, apellido, razon_social, cuit, email, telefono, pais, provincia, ciudad, codigo_postal, calle, numero, piso, departamento, activo, created_at, updated_at) VALUES
(7, 'Jorge', NULL, 'asdasd', '34234', 'asdasd@asda.com', '12312312', 'Argentina', 'Córdoba', 'Almafuerte', '3434', '', '', '', '', true, to_timestamp(1781642537), to_timestamp(1781642537)),
(8, 'Pablo ', NULL, 'Collazo', '20134987554', 'to3007to@gmail.com', '2966628269', 'Argentina', 'CABA', 'Venado Tuerto', '2600', 'Ismael Iraola', '1270', '', '', true, to_timestamp(1782136460), to_timestamp(1782136460)),
(9, 'INMAC', NULL, 'Ingenieria y Arquitectura', '30715420526', 'to3007to@gmail.com', '3462320642', 'Argentina', 'CABA', 'CABA', '1106', 'Av. Bouchard ', '547', '13', '', true, to_timestamp(1782488007), to_timestamp(1782488007)),
(10, 'Collino', NULL, 'Collino SRL', '42342424', 'collino@gmail.com', '', 'Argentina', '', '', '', '', '', '', '', true, to_timestamp(1784312464), to_timestamp(1784312464)),
(11, 'Peyte', NULL, 'PEty laboratorios', '4234234', 'asdas@gmail.com', '34234234', 'Argentina', '', '', '', '', '', '', '', true, to_timestamp(1784312952), to_timestamp(1784312952))
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- FEEDBACK
-- ============================================================

INSERT INTO feedback (id, mensaje, created_at) VALUES
(1, 'Priemr feedback!', to_timestamp(1782145161)),
(2, 'que se permita agregar modelos de cada marca  ', to_timestamp(1782487745)),
(3, 'Estaría bueno agregar un item que haga referencia al Nº de presupuesto o cotización', to_timestamp(1782488145)),
(4, 'en Categoría de productos no hay nada', to_timestamp(1782490277)),
(5, 'dar la posibilidad de agregar modelos de autos', to_timestamp(1782734196)),
(6, 'que podamos guardar un nuevo producto aunque no le pongamos todas las medidas de diámetros y longitudes', to_timestamp(1782734246))
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TAREAS
-- ============================================================

INSERT INTO tareas (id, titulo, descripcion, estado, orden, prioridad, fecha_entrega, asignado_a, created_at, updated_at) VALUES
(4, 'Compra de insumos', E'- Bridas para Amarok
- Gas para soldadoras
- Lentes de trabajo', 'pendiente', 0, 'media', to_timestamp(1784419200), 5, to_timestamp(1783943647), to_timestamp(1783943647)),
(5, 'Reelevamiento en laboratorio', 'Visitar el laboratorio y resolver dudas de requerimientos del cliente', 'pendiente', 1, 'media', to_timestamp(1784246400), 1, to_timestamp(1783944046), to_timestamp(1783944046))
ON CONFLICT (id) DO NOTHING;