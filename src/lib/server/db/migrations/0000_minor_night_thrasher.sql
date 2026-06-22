CREATE TABLE `acciones_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`estado_origen_id` integer,
	`estado_destino_id` integer,
	`created_at` integer,
	FOREIGN KEY (`estado_origen_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`estado_destino_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acciones_fabricacion_nombre_unique` ON `acciones_fabricacion` (`nombre`);--> statement-breakpoint
CREATE TABLE `categorias_competencia` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`tipo_vehiculo_id` integer NOT NULL,
	`activa_desde` integer,
	`activa_hasta` integer,
	`vigente` integer DEFAULT true,
	FOREIGN KEY (`tipo_vehiculo_id`) REFERENCES `tipos_vehiculo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categorias_productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_productos_nombre_unique` ON `categorias_productos` (`nombre`);--> statement-breakpoint
CREATE TABLE `clientes` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_cuit_unique` ON `clientes` (`cuit`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `empleados_email_unique` ON `empleados` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `empleados_dni_unique` ON `empleados` (`dni`);--> statement-breakpoint
CREATE TABLE `estados_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`orden` integer NOT NULL,
	`color` text,
	`es_final` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `estados_fabricacion_nombre_unique` ON `estados_fabricacion` (`nombre`);--> statement-breakpoint
CREATE UNIQUE INDEX `estados_fabricacion_slug_unique` ON `estados_fabricacion` (`slug`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `estados_pedido_nombre_unique` ON `estados_pedido` (`nombre`);--> statement-breakpoint
CREATE UNIQUE INDEX `estados_pedido_slug_unique` ON `estados_pedido` (`slug`);--> statement-breakpoint
CREATE TABLE `lineas_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`producto_id` integer,
	`orden_fabricacion_id` integer,
	`es_personalizado` integer DEFAULT false,
	`descripcion_personalizada` text,
	`fecha_envio_parcial` integer,
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
	`updated_at` integer,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`orden_fabricacion_id`) REFERENCES `ordenes_fabricacion`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `logs_pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`campo` text,
	`valor_anterior` text,
	`valor_nuevo` text,
	`accion` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `logs_sistema` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario_id` integer,
	`accion` text NOT NULL,
	`detalles` text,
	`ip_address` text,
	`created_at` integer,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_nombre_unique` ON `marcas` (`nombre`);--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `ordenes_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre_trabajo` text NOT NULL,
	`cantidad_total` integer DEFAULT 1 NOT NULL,
	`cantidad_producida` integer DEFAULT 0,
	`cantidad_defectuosa` integer DEFAULT 0,
	`estado_id` integer NOT NULL,
	`estado_comentario` text,
	`prioridad` integer DEFAULT 0,
	`fecha_inicio` integer,
	`fecha_fin_estimada` integer,
	`fecha_fin_real` integer,
	`asignado_a` integer,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asignado_a`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_pedido` text NOT NULL,
	`cliente_id` integer NOT NULL,
	`fecha_pedido` integer NOT NULL,
	`fecha_entrega_prometida` integer,
	`fecha_entrega_real` integer,
	`estado_id` integer NOT NULL,
	`precio_total` real,
	`anticipo` real,
	`saldo_pendiente` real,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_pedido`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pedidos_numero_pedido_unique` ON `pedidos` (`numero_pedido`);--> statement-breakpoint
CREATE TABLE `permisos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`accion` text NOT NULL,
	`modulo` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `productos` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `productos_codigo_unique` ON `productos` (`codigo`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_nombre_unique` ON `roles` (`nombre`);--> statement-breakpoint
CREATE TABLE `roles_permisos` (
	`rol_id` integer,
	`permiso_id` integer,
	`created_at` integer,
	PRIMARY KEY(`rol_id`, `permiso_id`),
	FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sesiones` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tipos_material` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`unidad` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipos_material_nombre_unique` ON `tipos_material` (`nombre`);--> statement-breakpoint
CREATE TABLE `tipos_uso` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipos_uso_slug_unique` ON `tipos_uso` (`slug`);--> statement-breakpoint
CREATE TABLE `tipos_vehiculo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`activo` integer DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tipos_vehiculo_slug_unique` ON `tipos_vehiculo` (`slug`);--> statement-breakpoint
CREATE TABLE `unidades_fabricacion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orden_fabricacion_id` integer NOT NULL,
	`numero_serie` text NOT NULL,
	`estado_id` integer NOT NULL,
	`estado_anterior_id` integer,
	`estado_comentario` text,
	`fecha_entrada_estado` integer,
	`es_defectuoso` integer DEFAULT false,
	`defecto_descripcion` text,
	`foto_urls` text,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`orden_fabricacion_id`) REFERENCES `ordenes_fabricacion`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`estado_anterior_id`) REFERENCES `estados_fabricacion`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_username_unique` ON `usuarios` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_empleado_id_unique` ON `usuarios` (`empleado_id`);