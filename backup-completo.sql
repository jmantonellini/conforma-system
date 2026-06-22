PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0000_flat_star_brand.sql','2026-05-26 19:01:53');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0000_lucky_nomad.sql','2026-05-27 18:16:09');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0000_new_star_brand.sql','2026-05-29 16:37:16');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0000_warm_tomorrow_man.sql','2026-05-29 17:04:42');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0001_wooden_omega_sentinel.sql','2026-06-02 21:02:00');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0002_late_lake.sql','2026-06-03 21:41:47');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0003_rainy_spencer_smythe.sql','2026-06-04 19:18:04');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(8,'0004_short_silver_samurai.sql','2026-06-09 23:59:10');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(9,'0005_abnormal_siren.sql','2026-06-10 02:26:35');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(10,'0006_dusty_slayback.sql','2026-06-12 17:27:47');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(11,'0000_tense_texas_twister.sql','2026-06-12 19:27:47');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(12,'0001_elite_starjammers.sql','2026-06-18 21:53:04');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(13,'0002_nappy_leech.sql','2026-06-19 13:43:01');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(14,'0003_classy_whizzer.sql','2026-06-19 13:51:20');
CREATE TABLE `categorias_productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`created_at` integer
);
INSERT INTO "categorias_productos" ("id","nombre","descripcion","created_at") VALUES(1,'Escapes','Escapes',NULL);
INSERT INTO "categorias_productos" ("id","nombre","descripcion","created_at") VALUES(2,'Industria','Industria',NULL);
INSERT INTO "categorias_productos" ("id","nombre","descripcion","created_at") VALUES(3,'Arquitectura','Arquitectura',NULL);
INSERT INTO "categorias_productos" ("id","nombre","descripcion","created_at") VALUES(4,'Otros','Otros',NULL);
CREATE TABLE `empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`apellido` text NOT NULL,
	`email` text,
	`telefono` text,
	`dni` text,
	`direccion` text,
	`fecha_ingreso` integer,
	`activo` integer DEFAULT true,
	`created_at` integer
);
INSERT INTO "empleados" ("id","nombre","apellido","email","telefono","dni","direccion","fecha_ingreso","activo","created_at") VALUES(1,'Juan Manuel','Antonellini',NULL,'342423','432424234',NULL,1782432000,1,1781806535);
CREATE TABLE `estados_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`orden` integer NOT NULL,
	`color` text,
	`es_final` integer DEFAULT false,
	`created_at` integer
);
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(1,'Preparando material','preparando_material',1,'warning',0,NULL);
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(2,'En producción','en_produccion',2,'info',0,NULL);
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(3,'Limpieza','limpieza',3,'info',0,NULL);
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(4,'Terminado','terminado',4,'success',NULL,NULL);
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(5,'Pausado','pausado',5,'error',0,NULL);
CREATE TABLE `estados_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`orden` integer NOT NULL,
	`color` text,
	`requiere_notificacion` integer DEFAULT false,
	`es_final` integer DEFAULT false,
	`created_at` integer
);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(1,'Pendiente','pendiente',0,'warning',0,0,NULL);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(2,'En producción','en_produccion',1,'info',0,0,NULL);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(3,'Completado','completado',2,'success',0,0,NULL);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(4,'Entregado','entregado',3,'success',0,1,NULL);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(5,'Cancelado','cancelado',4,'error',0,1,NULL);
INSERT INTO "estados_pedido" ("id","nombre","slug","orden","color","requiere_notificacion","es_final","created_at") VALUES(6,'Demorado','demorado',5,'error',0,0,NULL);
CREATE TABLE `lineas_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`producto_id` integer,
	`es_personalizado` integer DEFAULT false,
	`descripcion_personalizada` text,
	`medidas_primario_diametro` integer,
	`medidas_primario_largo` integer,
	`medidas_secundario_diametro` integer,
	`medidas_secundario_largo` integer,
	`trombon_diametro_inicial` integer,
	`trombon_largo` integer,
	`trombon_observaciones` text,
	`cantidad` integer DEFAULT 1 NOT NULL,
	`precio_unitario` real NOT NULL,
	`subtotal` real GENERATED ALWAYS AS (cantidad * precio_unitario) VIRTUAL,
	`orden_linea` integer,
	`created_at` integer,
	`updated_at` integer, orden_fabricacion_id INTEGER REFERENCES ordenes_fabricacion(id),
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE `logs_estados_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`estado_anterior_id` integer,
	`estado_nuevo_id` integer NOT NULL,
	`tiempo_empleado` integer,
	`comentario` text,
	`created_at` integer,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`estado_anterior_id`) REFERENCES `estados_pedido`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estado_nuevo_id`) REFERENCES `estados_pedido`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `logs_pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`campo` text,
	`valor_anterior` text,
	`valor_nuevo` text,
	`accion` text NOT NULL,
	`ip_address` text,
	`created_at` integer, `user_agent` text,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE `logs_sistema` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario_id` integer,
	`accion` text NOT NULL,
	`detalles` text,
	`ip_address` text,
	`created_at` integer,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE TABLE `logs_unidades_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unidad_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`estado_anterior_id` integer,
	`estado_nuevo_id` integer NOT NULL,
	`tiempo_transcurrido` integer,
	`comentario` text,
	`created_at` integer,
	FOREIGN KEY (`unidad_id`) REFERENCES `unidades_fabricacion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`estado_anterior_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estado_nuevo_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `materiales_empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orden_fabricacion_id` integer NOT NULL,
	`tipo_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`cantidad` real NOT NULL,
	`unidad` text NOT NULL,
	`costo_unitario` real,
	`costo_total` real GENERATED ALWAYS AS (cantidad * costo_unitario) VIRTUAL,
	`observaciones` text,
	`created_at` integer,
	FOREIGN KEY (`orden_fabricacion_id`) REFERENCES `ordenes_fabricacion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tipo_id`) REFERENCES `tipos_material`(`id`) ON UPDATE no action ON DELETE restrict
);
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`created_at` integer
);
INSERT INTO "roles" ("id","nombre","descripcion","created_at") VALUES(1,'operario','Consulta fabricación',NULL);
INSERT INTO "roles" ("id","nombre","descripcion","created_at") VALUES(2,'ventas','Crea pedidos y gestiona clientes',NULL);
INSERT INTO "roles" ("id","nombre","descripcion","created_at") VALUES(3,'tecnico','Gestiona productos y pedidos',NULL);
INSERT INTO "roles" ("id","nombre","descripcion","created_at") VALUES(4,'admin','Acceso total',NULL);
INSERT INTO "roles" ("id","nombre","descripcion","created_at") VALUES(5,'jefe_planta','Gestiona fabricación y pedidos',NULL);
CREATE TABLE `roles_permisos` (
	`rol_id` integer,
	`permiso_id` integer,
	`created_at` integer,
	PRIMARY KEY(`rol_id`, `permiso_id`),
	FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(1,13,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,1,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,2,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,3,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,4,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,5,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,6,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,7,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,8,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,9,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,10,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,11,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,12,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,13,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,14,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,15,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,16,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,17,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,18,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,19,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,20,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(4,21,NULL);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,1,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,2,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,3,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,5,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,9,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,10,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,11,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,14,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,15,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,6,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,8,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,7,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,12,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(2,4,1781809268);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,1,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,5,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,6,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,7,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,8,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,9,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,11,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,14,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,15,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(3,13,1781809294);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,1,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,5,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,9,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,11,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,13,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,14,1781809311);
INSERT INTO "roles_permisos" ("rol_id","permiso_id","created_at") VALUES(5,15,1781809311);
CREATE TABLE `sesiones` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('52c99c7f-b8ac-4c13-a8e9-33fe57522e97',1,1784320496,NULL,NULL,1781728496);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('9cc4b23e-9ecc-4678-9a2a-b5da8cb45580',1,1784344667,NULL,NULL,1781752667);
CREATE TABLE `tipos_material` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`unidad` text,
	`created_at` integer
);
CREATE TABLE `unidades_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orden_fabricacion_id` integer NOT NULL,
	`numero_serie` text NOT NULL,
	`estado_id` integer NOT NULL,
	`fecha_entrada_estado` integer,
	`es_defectuoso` integer DEFAULT false,
	`defecto_descripcion` text,
	`foto_urls` text,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`orden_fabricacion_id`) REFERENCES `ordenes_fabricacion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE restrict
);
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol_id` integer,
	`empleado_id` integer,
	`activo` integer DEFAULT true,
	`ultimo_acceso` integer,
	`created_at` integer,
	FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO "usuarios" ("id","username","password_hash","rol_id","empleado_id","activo","ultimo_acceso","created_at") VALUES(1,'admin','$2b$10$ZagFSe7xLEFVmWyZrmNeTe3WVwVeckKiwNyedjht0hmvOUryGf7M6',4,1,1,NULL,1781022983);
INSERT INTO "usuarios" ("id","username","password_hash","rol_id","empleado_id","activo","ultimo_acceso","created_at") VALUES(4,'jorgito','$2b$10$ApOmEOZJ6B0KeR0EaXoKzO3AtRDIgAZfKZgwCl6lPaoMg/IhHGEOC',3,NULL,1,NULL,1781796984);
INSERT INTO "usuarios" ("id","username","password_hash","rol_id","empleado_id","activo","ultimo_acceso","created_at") VALUES(5,'dana','$2b$10$1618EKuiYJAN.zcHZxhwK.sk5uQUB1KYu8YwVKSmNjS1Ko9BWcuc2',3,NULL,1,NULL,1781797097);
CREATE TABLE IF NOT EXISTS "pedidos" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_pedido` text NOT NULL,
	`cliente_id` integer NOT NULL,
	`fecha_pedido` integer NOT NULL,
	`fecha_entrega_prometida` integer,
	`fecha_entrega_real` integer,
	`estado_id` integer NOT NULL,
	`precio_total` real,
	"anticipo" real,
	`saldo_pendiente` real,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_pedido`(`id`) ON UPDATE no action ON DELETE restrict
);
CREATE TABLE IF NOT EXISTS "clientes" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`razon_social` text,
	`cuit` text,
	`email` text,
	`telefono` text,
	`pais` text DEFAULT 'Argentina',
	`provincia` text,
	`ciudad` text,
	`codigo_postal` text,
	`calle` text,
	`numero` text,
	`piso` text,
	`departamento` text,
	`activo` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at") VALUES(2,'Anibal','','','algo@gmail.com','','Argentina','Corrientes','','','','','','',1,1780583801,1780583801);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at") VALUES(7,'Jorge','asdasd','34234','asdasd@asda.com','12312312','Argentina','Córdoba','Almafuerte','3434','','','','',1,1781642537,1781642537);
CREATE TABLE `categorias_competencia` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	"tipo_vehiculo_id" integer NOT NULL,
	`activa_desde` integer,
	`activa_hasta` integer,
	`vigente` integer DEFAULT true,
	FOREIGN KEY ("tipo_vehiculo_id") REFERENCES `tipos_uso`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "categorias_competencia" ("id","nombre","descripcion","tipo_vehiculo_id","activa_desde","activa_hasta","vigente") VALUES(1,'TC 2000','TC 2000',1,NULL,NULL,1);
INSERT INTO "categorias_competencia" ("id","nombre","descripcion","tipo_vehiculo_id","activa_desde","activa_hasta","vigente") VALUES(2,'TC','Turismo Carretera',1,NULL,NULL,1);
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true
);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(1,'Ford',1);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(2,'Chevrolet',1);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(3,'Honda',1);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(4,'Yamaha',1);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(5,'BMW',1);
INSERT INTO "marcas" ("id","nombre","activo") VALUES(6,'Mercedes-Benz',1);
CREATE TABLE `modelos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`marca_id` integer NOT NULL,
	`tipo_vehiculo_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`anio_desde` integer,
	`anio_hasta` integer,
	`activo` integer DEFAULT true,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`tipo_vehiculo_id`) REFERENCES `tipos_vehiculo`(`id`) ON UPDATE no action ON DELETE restrict
);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(1,1,1,'Fiesta',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(2,1,1,'Focus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(3,3,2,'CBR 600',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(4,3,2,'CB 190',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(5,4,2,'YZF-R6',NULL,NULL,1);
CREATE TABLE `tipos_uso` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL
);
INSERT INTO "tipos_uso" ("id","nombre","slug") VALUES(1,'Calle','calle');
INSERT INTO "tipos_uso" ("id","nombre","slug") VALUES(2,'Competición','competencia');
INSERT INTO "tipos_uso" ("id","nombre","slug") VALUES(3,'Colección','coleccion');
INSERT INTO "tipos_uso" ("id","nombre","slug") VALUES(4,'Otro','otro');
CREATE TABLE `tipos_vehiculo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`activo` integer DEFAULT true
);
INSERT INTO "tipos_vehiculo" ("id","nombre","slug","activo") VALUES(1,'Auto','auto',1);
INSERT INTO "tipos_vehiculo" ("id","nombre","slug","activo") VALUES(2,'Moto','moto',1);
INSERT INTO "tipos_vehiculo" ("id","nombre","slug","activo") VALUES(3,'Camioneta','camioneta',1);
INSERT INTO "tipos_vehiculo" ("id","nombre","slug","activo") VALUES(4,'Avión','avion',1);
CREATE TABLE IF NOT EXISTS "productos" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`categoria_id` integer,
	`medidas_primario_diametro` integer,
	`medidas_primario_largo` integer,
	`medidas_secundario_diametro` integer,
	`medidas_secundario_largo` integer,
	`trombon_diametro_inicial` integer,
	`trombon_largo` integer,
	`trombon_observaciones` text,
	`tipo_vehiculo_id` integer,
	`marca_id` integer,
	`modelo_id` integer,
	`tipo_uso_id` integer,
	`categoria_competencia_id` integer,
	`precio_base` real,
	`es_personalizable` integer DEFAULT true,
	`activo` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias_productos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tipo_vehiculo_id`) REFERENCES `tipos_vehiculo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tipo_uso_id`) REFERENCES `tipos_uso`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoria_competencia_id`) REFERENCES `categorias_competencia`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(8,'CODIGO MOTO','24232222222',1,232,232,3232,232,3232,446,replace('adasdasd\n','\n',char(10)),2,4,5,3,1,10000,0,1,1781106561,1781638403);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(11,'44444','FFFFF',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,444,0,1,1781647528,1781647528);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(12,'55555','dasdasdasd',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,333,0,1,1781647651,1781647651);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(13,'9999','JJJJJJJ',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,144,0,1,1781656708,1781656708);
CREATE TABLE IF NOT EXISTS "permisos" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"accion" text NOT NULL,
	`modulo` text NOT NULL,
	`created_at` integer
);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(1,'view','clientes',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(2,'create','clientes',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(3,'edit','clientes',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(4,'delete','clientes',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(5,'view','productos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(6,'create','productos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(7,'edit','productos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(8,'delete','productos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(9,'view','pedidos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(10,'create','pedidos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(11,'edit','pedidos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(12,'delete','pedidos',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(13,'view','taller',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(14,'edit','taller',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(15,'delete','taller',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(16,'view','usuarios',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(17,'create','usuarios',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(18,'edit','usuarios',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(19,'delete','usuarios',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(20,'view','configuracion',NULL);
INSERT INTO "permisos" ("id","accion","modulo","created_at") VALUES(21,'edit','configuracion',NULL);
CREATE TABLE ordenes_fabricacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_trabajo TEXT NOT NULL,
  cantidad_total INTEGER NOT NULL DEFAULT 1,
  cantidad_producida INTEGER DEFAULT 0,
  cantidad_defectuosa INTEGER DEFAULT 0,
  estado_id INTEGER NOT NULL REFERENCES estados_fabricacion(id),
  prioridad INTEGER DEFAULT 0,
  fecha_inicio INTEGER,
  fecha_fin_estimada INTEGER,
  fecha_fin_real INTEGER,
  asignado_a INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at INTEGER,
  updated_at INTEGER
, `estado_anterior_id` integer REFERENCES estados_fabricacion(id), `estado_comentario` text);
CREATE TABLE IF NOT EXISTS "acciones_fabricacion" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`estado_origen_id` integer,
	`estado_destino_id` integer, `created_at` integer,
	FOREIGN KEY (`estado_origen_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estado_destino_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "acciones_fabricacion" ("id","nombre","estado_origen_id","estado_destino_id","created_at") VALUES(1,'Iniciar',1,2,NULL);
INSERT INTO "acciones_fabricacion" ("id","nombre","estado_origen_id","estado_destino_id","created_at") VALUES(2,'Pasar a limpieza',2,3,NULL);
INSERT INTO "acciones_fabricacion" ("id","nombre","estado_origen_id","estado_destino_id","created_at") VALUES(3,'Terminar',3,4,NULL);
INSERT INTO "acciones_fabricacion" ("id","nombre","estado_origen_id","estado_destino_id","created_at") VALUES(4,'Pausar',NULL,5,NULL);
INSERT INTO "acciones_fabricacion" ("id","nombre","estado_origen_id","estado_destino_id","created_at") VALUES(7,'Reanudar',5,NULL,NULL);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',14);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('pedidos',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('clientes',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('usuarios',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('estados_pedido',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('estados_fabricacion',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('lineas_pedido',12);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('logs_pedidos',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('tipos_vehiculo',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('tipos_uso',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('marcas',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('modelos',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categorias_productos',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('productos',13);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categorias_competencia',2);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('roles',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('permisos',21);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('unidades_fabricacion',22);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('ordenes_fabricacion',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('empleados',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('acciones_fabricacion',7);
CREATE UNIQUE INDEX `categorias_productos_nombre_unique` ON `categorias_productos` (`nombre`);
CREATE UNIQUE INDEX `empleados_email_unique` ON `empleados` (`email`);
CREATE UNIQUE INDEX `empleados_dni_unique` ON `empleados` (`dni`);
CREATE UNIQUE INDEX `estados_fabricacion_nombre_unique` ON `estados_fabricacion` (`nombre`);
CREATE UNIQUE INDEX `estados_fabricacion_slug_unique` ON `estados_fabricacion` (`slug`);
CREATE UNIQUE INDEX `estados_pedido_nombre_unique` ON `estados_pedido` (`nombre`);
CREATE UNIQUE INDEX `estados_pedido_slug_unique` ON `estados_pedido` (`slug`);
CREATE UNIQUE INDEX `roles_nombre_unique` ON `roles` (`nombre`);
CREATE UNIQUE INDEX `tipos_material_nombre_unique` ON `tipos_material` (`nombre`);
CREATE UNIQUE INDEX `usuarios_username_unique` ON `usuarios` (`username`);
CREATE UNIQUE INDEX `usuarios_empleado_id_unique` ON `usuarios` (`empleado_id`);
CREATE UNIQUE INDEX `pedidos_numero_pedido_unique` ON `pedidos` (`numero_pedido`);
CREATE UNIQUE INDEX `clientes_cuit_unique` ON `clientes` (`cuit`);
CREATE UNIQUE INDEX `marcas_nombre_unique` ON `marcas` (`nombre`);
CREATE UNIQUE INDEX `tipos_uso_slug_unique` ON `tipos_uso` (`slug`);
CREATE UNIQUE INDEX `tipos_vehiculo_slug_unique` ON `tipos_vehiculo` (`slug`);
CREATE UNIQUE INDEX `productos_codigo_unique` ON `productos` (`codigo`);
CREATE UNIQUE INDEX `acciones_fabricacion_nombre_unique` ON `acciones_fabricacion` (`nombre`);
