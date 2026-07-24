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
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(15,'0000_minor_night_thrasher.sql','2026-06-20 19:01:53');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(16,'0001_bitter_adam_destine.sql','2026-06-22 14:13:54');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(17,'0005_tidy_morlocks.sql','2026-07-06 20:01:58');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(18,'0006_absurd_pandemic.sql','2026-07-07 21:45:25');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(19,'0007_sour_jigsaw.sql','2026-07-11 17:06:29');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(20,'0008_harsh_inertia.sql','2026-07-15 14:48:19');
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
INSERT INTO "empleados" ("id","nombre","apellido","email","telefono","dni","direccion","fecha_ingreso","activo","created_at") VALUES(2,'Erica','Vallejos',NULL,NULL,NULL,NULL,NULL,1,1781961138);
INSERT INTO "empleados" ("id","nombre","apellido","email","telefono","dni","direccion","fecha_ingreso","activo","created_at") VALUES(3,'Romina','Porta',NULL,NULL,NULL,NULL,NULL,1,1781961302);
INSERT INTO "empleados" ("id","nombre","apellido","email","telefono","dni","direccion","fecha_ingreso","activo","created_at") VALUES(4,'Mauro','Tossoni',NULL,NULL,NULL,NULL,NULL,1,1781964848);
INSERT INTO "empleados" ("id","nombre","apellido","email","telefono","dni","direccion","fecha_ingreso","activo","created_at") VALUES(5,'Alejandro Mario','Antonellini',NULL,NULL,NULL,NULL,NULL,1,1781964888);
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
INSERT INTO "estados_fabricacion" ("id","nombre","slug","orden","color","es_final","created_at") VALUES(4,'Terminado','terminado',4,'success',1,NULL);
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
	`updated_at` integer, orden_fabricacion_id INTEGER REFERENCES ordenes_fabricacion(id), fecha_envio_parcial INTEGER,
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
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('9cc4b23e-9ecc-4678-9a2a-b5da8cb45580',1,1784344667,NULL,NULL,1781752667);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('80a1f517-1eae-4eb5-97f3-ee0b06a622f1',1,1784726765,NULL,NULL,1782134765);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('11c1b322-889b-45dd-b769-5a21ba7de2be',1,1784727792,NULL,NULL,1782135792);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('7b493982-e044-40e0-8084-9746af609fd7',1,1784735997,NULL,NULL,1782143997);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('4041e057-a63a-455c-8253-8624dd647205',1,1785092326,NULL,NULL,1782500326);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('28a7a440-8fb3-4131-8462-7d23ae419eef',1,1785521392,NULL,NULL,1782929392);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('cf67783a-a8ed-4381-9c48-872785f9144e',1,1785956619,NULL,NULL,1783364619);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('d3c012a3-920b-40a6-b5b8-5ce8026b7b4d',1,1786536512,NULL,NULL,1783944512);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('e4225612-bd05-48d5-b028-553fa401b53c',1,1786549633,NULL,NULL,1783957633);
INSERT INTO "sesiones" ("id","user_id","expires_at","ip_address","user_agent","created_at") VALUES('8c00dc43-8294-4f1a-8f0d-235b57ed80de',1,1787406962,NULL,NULL,1784814962);
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
	`updated_at` integer, estado_anterior_id INTEGER REFERENCES estados_fabricacion(id), estado_comentario TEXT,
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
, `apellido` text);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at","apellido") VALUES(7,'Jorge','asdasd','34234','asdasd@asda.com','12312312','Argentina','Córdoba','Almafuerte','3434','','','','',1,1781642537,1781642537,NULL);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at","apellido") VALUES(8,'Pablo ','Collazo','20134987554','to3007to@gmail.com','2966628269','Argentina','CABA','Venado Tuerto','2600','Ismael Iraola','1270','','',1,1782136460,1782136460,NULL);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at","apellido") VALUES(9,'INMAC','Ingenieria y Arquitectura','30715420526','to3007to@gmail.com','3462320642','Argentina','CABA','CABA','1106','Av. Bouchard ','547','13','',1,1782488007,1782488007,NULL);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at","apellido") VALUES(10,'Collino','Collino SRL','42342424','collino@gmail.com','','Argentina','','','','','','','',1,1784312464,1784312464,NULL);
INSERT INTO "clientes" ("id","nombre","razon_social","cuit","email","telefono","pais","provincia","ciudad","codigo_postal","calle","numero","piso","departamento","activo","created_at","updated_at","apellido") VALUES(11,'Peyte','PEty laboratorios','4234234','asdas@gmail.com','34234234','Argentina','','','','','','','',1,1784312952,1784312952,NULL);
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
INSERT INTO "categorias_competencia" ("id","nombre","descripcion","tipo_vehiculo_id","activa_desde","activa_hasta","vigente") VALUES(3,'GP','Moto GP',2,NULL,NULL,1);
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true
, `logo_url` text);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(1,'Ford',1,'https://cdn.simpleicons.org/ford');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(2,'Chevrolet',1,'https://cdn.simpleicons.org/chevrolet');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(3,'Honda',1,'https://cdn.simpleicons.org/honda');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(4,'Yamaha',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(5,'BMW',1,'https://cdn.simpleicons.org/bmw');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(6,'Mercedes-Benz',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mercedes-benz-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(7,'Volkswagen',1,'https://cdn.simpleicons.org/volkswagen');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(8,'Toyota',1,'https://cdn.simpleicons.org/toyota');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(9,'Nissan',1,'https://cdn.simpleicons.org/nissan');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(10,'Hyundai',1,'https://cdn.simpleicons.org/hyundai');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(11,'Kia',1,'https://cdn.simpleicons.org/kia');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(12,'Mazda',1,'https://cdn.simpleicons.org/mazda');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(13,'Subaru',1,'https://cdn.simpleicons.org/subaru');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(14,'Mitsubishi',1,'https://cdn.simpleicons.org/mitsubishi');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(15,'Suzuki',1,'https://cdn.simpleicons.org/suzuki');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(16,'Daihatsu',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/daihatsu-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(17,'Isuzu',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(18,'Lexus',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lexus-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(19,'Acura',1,'https://cdn.simpleicons.org/acura');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(20,'Infiniti',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(21,'Audi',1,'https://cdn.simpleicons.org/audi');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(22,'Porsche',1,'https://cdn.simpleicons.org/porsche');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(23,'Volvo',1,'https://cdn.simpleicons.org/volvo');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(24,'Jaguar',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/jaguar-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(25,'Land Rover',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/land-rover-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(26,'Mini',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mini-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(27,'Fiat',1,'https://cdn.simpleicons.org/fiat');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(28,'Peugeot',1,'https://cdn.simpleicons.org/peugeot');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(29,'Citroën',1,'https://cdn.simpleicons.org/citroen');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(30,'Renault',1,'https://cdn.simpleicons.org/renault');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(31,'Alfa Romeo',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/alfa-romeo-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(32,'Lancia',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lancia-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(33,'Maserati',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(34,'Ferrari',1,'https://cdn.simpleicons.org/ferrari');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(35,'Lamborghini',1,'https://cdn.simpleicons.org/lamborghini');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(36,'McLaren',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mclaren-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(37,'Aston Martin',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/aston-martin-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(38,'Bentley',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/bentley-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(39,'Rolls-Royce',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/rolls-royce-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(40,'Tesla',1,'https://cdn.simpleicons.org/tesla');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(41,'Rivian',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/rivian-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(42,'Lucid',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lucid-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(43,'Polestar',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/polestar-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(44,'BYD',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(45,'Geely',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(46,'Great Wall',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(47,'Chery',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/chery-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(48,'MG',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/mg-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(49,'SEAT',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/seat-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(50,'Skoda',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/skoda-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(51,'Dodge',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/dodge-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(52,'Ram',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/ram-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(53,'Jeep',1,'https://cdn.simpleicons.org/jeep');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(54,'Chrysler',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/chrysler-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(55,'Buick',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/buick-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(56,'GMC',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/gmc-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(57,'Cadillac',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/cadillac-logo.png');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(58,'Lincoln',1,'https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@v1.0.0/lincoln-logo.svg');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(59,'Genesis',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(60,'Kawasaki',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(61,'Ducati',1,'https://cdn.simpleicons.org/ducati');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(62,'Triumph',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(63,'Harley-Davidson',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(64,'KTM',1,'https://cdn.simpleicons.org/ktm');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(65,'Husqvarna',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(66,'Aprilia',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(67,'Moto Guzzi',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(68,'MV Agusta',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(69,'Benelli',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(70,'Royal Enfield',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(71,'Bajaj',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(72,'TVS',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(73,'Hero',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(74,'CFMoto',1,'');
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(75,'Bimota',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(76,'Norton',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(77,'Indian',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(78,'Victory',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(79,'Ural',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(80,'Scania',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(81,'Volvo Trucks',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(82,'MAN',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(83,'Iveco',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(84,'DAF',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(85,'Kenworth',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(86,'Peterbilt',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(87,'Freightliner',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(88,'International',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(89,'Mack',1,NULL);
INSERT INTO "marcas" ("id","nombre","activo","logo_url") VALUES(90,'Western Star',1,NULL);
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
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(6,51,1,'Challenger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(7,51,1,'Charger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(8,51,1,'Durango',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(9,51,1,'Ram',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(10,1,1,'Fiesta',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(11,1,1,'Focus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(12,1,1,'Mondeo',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(13,1,1,'Mustang',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(14,1,1,'Ranger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(15,1,1,'F-150',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(16,1,1,'Explorer',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(17,1,1,'Escape',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(18,1,1,'Bronco',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(19,1,1,'Maverick',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(20,1,1,'Edge',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(21,1,1,'Expedition',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(22,1,1,'Transit',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(23,1,1,'E-Transit',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(24,1,1,'Mach-E',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(25,1,1,'F-250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(26,1,1,'F-350',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(27,1,1,'Taurus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(28,1,1,'Fusion',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(29,2,1,'Onix',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(30,2,1,'Prisma',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(31,2,1,'Cruze',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(32,2,1,'Cobalt',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(33,2,1,'Camaro',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(34,2,1,'Corvette',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(35,2,1,'Silverado',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(36,2,1,'Colorado',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(37,2,1,'S-10',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(38,2,1,'Blazer',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(39,2,1,'Equinox',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(40,2,1,'Traverse',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(41,2,1,'Tahoe',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(42,2,1,'Suburban',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(43,2,1,'Trailblazer',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(44,2,1,'Spark',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(45,2,1,'Impala',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(46,2,1,'Malibu',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(47,7,1,'Gol',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(48,7,1,'Fox',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(49,7,1,'Voyage',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(50,7,1,'Saveiro',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(51,7,1,'Amarok',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(52,7,1,'Golf',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(53,7,1,'Jetta',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(54,7,1,'Passat',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(55,7,1,'Tiguan',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(56,7,1,'Taos',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(57,7,1,'Nivus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(58,7,1,'T-Cross',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(59,7,1,'ID.4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(60,7,1,'Vento',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(61,7,1,'Polo',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(62,7,1,'Virtus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(63,7,1,'Touareg',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(64,8,1,'Corolla',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(65,8,1,'Camry',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(66,8,1,'Hilux',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(67,8,1,'SW4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(68,8,1,'RAV4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(69,8,1,'Yaris',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(70,8,1,'Etios',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(71,8,1,'Prius',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(72,8,1,'Highlander',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(73,8,1,'Land Cruiser',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(74,8,1,'Supra',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(75,8,1,'GR86',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(76,8,1,'Sienna',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(77,8,1,'Tundra',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(78,8,1,'Tacoma',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(79,3,1,'Civic',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(80,3,1,'Accord',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(81,3,1,'Fit',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(82,3,1,'City',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(83,3,1,'HR-V',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(84,3,1,'CR-V',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(85,3,1,'Pilot',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(86,3,1,'Passport',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(87,3,1,'Ridgeline',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(88,3,1,'Odyssey',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(89,3,1,'NSX',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(90,9,1,'Sentra',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(91,9,1,'Versa',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(92,9,1,'Altima',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(93,9,1,'Kicks',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(94,9,1,'Rogue',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(95,9,1,'Pathfinder',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(96,9,1,'Frontier',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(97,9,1,'Titan',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(98,9,1,'370Z',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(99,9,1,'GT-R',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(100,9,1,'Leaf',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(101,9,1,'Armada',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(102,10,1,'HB20',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(103,10,1,'Creta',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(104,10,1,'Tucson',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(105,10,1,'Santa Fe',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(106,10,1,'Palisade',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(107,10,1,'Elantra',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(108,10,1,'Sonata',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(109,10,1,'Kona',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(110,10,1,'Ioniq',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(111,10,1,'Accent',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(112,11,1,'Picanto',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(113,11,1,'Rio',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(114,11,1,'Cerato',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(115,11,1,'Sportage',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(116,11,1,'Sorento',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(117,11,1,'Telluride',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(118,11,1,'Stinger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(119,11,1,'EV6',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(120,11,1,'Niro',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(121,21,1,'A3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(122,21,1,'A4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(123,21,1,'A5',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(124,21,1,'A6',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(125,21,1,'A8',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(126,21,1,'Q3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(127,21,1,'Q5',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(128,21,1,'Q7',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(129,21,1,'Q8',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(130,21,1,'e-tron',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(131,21,1,'TT',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(132,21,1,'R8',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(133,5,1,'Serie 1',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(134,5,1,'Serie 3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(135,5,1,'Serie 5',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(136,5,1,'Serie 7',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(137,5,1,'X1',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(138,5,1,'X3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(139,5,1,'X5',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(140,5,1,'X7',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(141,5,1,'i3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(142,5,1,'i4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(143,5,1,'iX',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(144,5,1,'M3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(145,5,1,'M4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(146,5,1,'M5',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(147,5,1,'M8',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(148,6,1,'Clase A',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(149,6,1,'Clase B',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(150,6,1,'Clase C',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(151,6,1,'Clase E',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(152,6,1,'Clase S',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(153,6,1,'Clase G',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(154,6,1,'GLA',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(155,6,1,'GLC',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(156,6,1,'GLE',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(157,6,1,'GLS',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(158,6,1,'EQS',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(159,6,1,'EQE',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(160,6,1,'AMG GT',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(161,6,1,'Sprinter',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(162,27,1,'Cronos',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(163,27,1,'Argo',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(164,27,1,'Mobi',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(165,27,1,'Pulse',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(166,27,1,'Fastback',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(167,27,1,'Strada',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(168,27,1,'Toro',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(169,27,1,'Uno',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(170,27,1,'Punto',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(171,27,1,'Palio',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(172,27,1,'500',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(173,27,1,'500X',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(174,30,1,'Kwid',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(175,30,1,'Sandero',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(176,30,1,'Logan',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(177,30,1,'Stepway',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(178,30,1,'Duster',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(179,30,1,'Oroch',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(180,30,1,'Kangoo',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(181,30,1,'Megane',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(182,30,1,'Clio',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(183,30,1,'Captur',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(184,28,1,'208',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(185,28,1,'2008',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(186,28,1,'308',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(187,28,1,'3008',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(188,28,1,'408',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(189,28,1,'508',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(190,28,1,'5008',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(191,28,1,'Partner',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(192,28,1,'Expert',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(193,29,1,'C3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(194,29,1,'C3 Aircross',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(195,29,1,'C4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(196,29,1,'C4 Cactus',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(197,29,1,'Berlingo',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(198,29,1,'Jumpy',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(199,53,1,'Renegade',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(200,53,1,'Compass',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(201,53,1,'Wrangler',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(202,53,1,'Gladiator',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(203,53,1,'Cherokee',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(204,53,1,'Grand Cherokee',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(205,53,1,'Commander',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(206,51,1,'Challenger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(207,51,1,'Charger',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(208,51,1,'Durango',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(209,51,1,'Ram',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(210,3,2,'CBR 600',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(211,3,2,'CBR 1000',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(212,3,2,'CB 500',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(213,3,2,'CB 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(214,3,2,'Africa Twin',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(215,3,2,'XR 150',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(216,3,2,'Tornado',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(217,3,2,'CG 125',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(218,3,2,'Fury',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(219,3,2,'CBF 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(220,4,2,'YZF-R3',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(221,4,2,'YZF-R6',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(222,4,2,'YZF-R1',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(223,4,2,'MT-03',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(224,4,2,'MT-07',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(225,4,2,'MT-09',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(226,4,2,'Ténéré 700',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(227,4,2,'XTZ 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(228,4,2,'WR 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(229,4,2,'Neos',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(230,4,2,'YZF-S',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(231,60,2,'Ninja 400',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(232,60,2,'Ninja 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(233,60,2,'Ninja 1000',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(234,60,2,'Z400',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(235,60,2,'Z650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(236,60,2,'Z900',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(237,60,2,'Versys 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(238,60,2,'Versys 1000',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(239,60,2,'KLR 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(240,60,2,'Vulcan 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(241,15,2,'GSX-R600',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(242,15,2,'GSX-R750',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(243,15,2,'GSX-R1000',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(244,15,2,'SV650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(245,15,2,'V-Strom 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(246,15,2,'V-Strom 1000',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(247,15,2,'DRZ 400',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(248,15,2,'GW 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(249,15,2,'GSX-S 750',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(250,61,2,'Panigale V2',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(251,61,2,'Panigale V4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(252,61,2,'Streetfighter V2',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(253,61,2,'Streetfighter V4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(254,61,2,'Monster',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(255,61,2,'Scrambler',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(256,61,2,'Diavel',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(257,61,2,'Multistrada',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(258,61,2,'Hypermotard',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(259,61,2,'Supersport',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(260,62,2,'Bonneville',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(261,62,2,'Street Twin',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(262,62,2,'Speed Twin',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(263,62,2,'Scrambler 900',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(264,62,2,'Scrambler 1200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(265,62,2,'Tiger 660',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(266,62,2,'Tiger 900',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(267,62,2,'Tiger 1200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(268,62,2,'Street Triple',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(269,62,2,'Speed Triple',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(270,63,2,'Sportster 883',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(271,63,2,'Sportster 1200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(272,63,2,'Iron 883',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(273,63,2,'Iron 1200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(274,63,2,'Softail Standard',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(275,63,2,'Softail Fat Boy',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(276,63,2,'Street Bob',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(277,63,2,'Road King',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(278,63,2,'Road Glide',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(279,63,2,'Street Glide',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(280,63,2,'Pan America',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(281,63,2,'LiveWire',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(282,64,2,'Duke 125',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(283,64,2,'Duke 200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(284,64,2,'Duke 390',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(285,64,2,'Duke 690',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(286,64,2,'Duke 890',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(287,64,2,'RC 200',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(288,64,2,'RC 390',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(289,64,2,'Adventure 390',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(290,64,2,'Adventure 790',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(291,64,2,'Adventure 890',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(292,64,2,'EXC 450',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(293,64,2,'SX-F 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(294,64,2,'SX-F 450',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(295,66,2,'RS 125',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(296,66,2,'RS 250',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(297,66,2,'RS 660',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(298,66,2,'RSV4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(299,66,2,'Tuono 125',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(300,66,2,'Tuono 660',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(301,66,2,'Tuono V4',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(302,66,2,'Shiver 900',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(303,66,2,'Dorsoduro',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(304,67,2,'V7',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(305,67,2,'V9',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(306,67,2,'V85 TT',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(307,67,2,'Mandello',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(308,70,2,'Classic 350',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(309,70,2,'Bullet 350',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(310,70,2,'Meteor 350',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(311,70,2,'Interceptor 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(312,70,2,'Continental GT 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(313,70,2,'Himalayan',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(314,70,2,'Scram 411',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(315,74,2,'NK 300',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(316,74,2,'NK 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(317,74,2,'NK 800',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(318,74,2,'SR 300',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(319,74,2,'SR 450',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(320,74,2,'MT 450',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(321,74,2,'MT 650',NULL,NULL,1);
INSERT INTO "modelos" ("id","marca_id","tipo_vehiculo_id","nombre","anio_desde","anio_hasta","activo") VALUES(322,74,2,'CL-X 700',NULL,NULL,1);
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
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(14,'TC001','Escape completo Ford Mustang',1,44,600,63,350,65,750,'Completo',1,1,1,2,2,2300,0,1,1782143562,1782143562);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(15,'TC002','Escape completo Chevrolet Camaro TC',1,48,600,63,500,68,750,'',1,2,34,2,NULL,2300,0,1,1782734277,1783475361);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(16,'4214','Escape Ford Mustang 2026',1,23,42,12,42,12,53,'',1,1,13,3,NULL,420,0,1,1783522037,1783522037);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(17,'2422','Escape Completo Amarok',1,20,32,42,54,23,42,'',1,7,51,1,NULL,1200,0,1,1783943308,1783943308);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(18,'5353','Parrilla 40x60',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,500,0,1,1783943871,1783943871);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(19,'5545','Bicicletero 4 lugares',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,600,0,1,1783943952,1783943952);
INSERT INTO "productos" ("id","codigo","nombre","categoria_id","medidas_primario_diametro","medidas_primario_largo","medidas_secundario_diametro","medidas_secundario_largo","trombon_diametro_inicial","trombon_largo","trombon_observaciones","tipo_vehiculo_id","marca_id","modelo_id","tipo_uso_id","categoria_competencia_id","precio_base","es_personalizable","activo","created_at","updated_at") VALUES(20,'234234','Escape completo Mustang',1,23,43,23,43,12,32,'',1,7,51,2,1,1200,0,1,1783945058,1783945058);
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
CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mensaje` text NOT NULL,
	`created_at` integer
);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(1,'Priemr feedback!',1782145161);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(2,'que se permita agregar modelos de cada marca  ',1782487745);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(3,'			Estaría bueno agregar un item que haga referencia al Nº de presupuesto o cotización',1782488145);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(4,'			en Categoría de productos no hay nada',1782490277);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(5,'			dar la posibilidad de agregar modelos de autos',1782734196);
INSERT INTO "feedback" ("id","mensaje","created_at") VALUES(6,'			que podamos guardar un nuevo producto aunque no le pongamos todas las medidas de diámetros y longitudes',1782734246);
CREATE TABLE `tareas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text NOT NULL,
	`descripcion` text,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`orden` integer DEFAULT 0,
	`prioridad` text DEFAULT 'media' NOT NULL,
	`fecha_entrega` integer,
	`asignado_a` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`asignado_a`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE set null
);
INSERT INTO "tareas" ("id","titulo","descripcion","estado","orden","prioridad","fecha_entrega","asignado_a","created_at","updated_at") VALUES(4,'Compra de insumos',replace('- Bridas para Amarok\n- Gas para soldadoras\n- Lentes de trabajo','\n',char(10)),'pendiente',0,'media',1784419200,5,1783943647,1783943647);
INSERT INTO "tareas" ("id","titulo","descripcion","estado","orden","prioridad","fecha_entrega","asignado_a","created_at","updated_at") VALUES(5,'Reelevamiento en laboratorio','Visitar el laboratorio y resolver dudas de requerimientos del cliente				','pendiente',1,'media',1784246400,1,1783944046,1783944046);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',20);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('pedidos',19);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('clientes',11);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('usuarios',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('estados_pedido',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('estados_fabricacion',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('lineas_pedido',24);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('logs_pedidos',15);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('tipos_vehiculo',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('tipos_uso',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('marcas',90);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('modelos',322);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categorias_productos',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('productos',20);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categorias_competencia',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('roles',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('permisos',21);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('unidades_fabricacion',50);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('ordenes_fabricacion',15);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('empleados',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('acciones_fabricacion',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('feedback',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('tareas',5);
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
CREATE INDEX `idx_lineas_pedido` ON `lineas_pedido` (`pedido_id`);
CREATE INDEX `idx_lineas_orden` ON `lineas_pedido` (`orden_fabricacion_id`);
CREATE INDEX `idx_ordenes_estado` ON `ordenes_fabricacion` (`estado_id`);
CREATE INDEX `idx_unidades_orden` ON `unidades_fabricacion` (`orden_fabricacion_id`);
CREATE INDEX `idx_unidades_estado` ON `unidades_fabricacion` (`estado_id`);
