CREATE TABLE `categorias_competencia` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`tipo_uso_id` integer NOT NULL,
	`activa_desde` integer,
	`activa_hasta` integer,
	`vigente` integer DEFAULT true,
	FOREIGN KEY (`tipo_uso_id`) REFERENCES `tipos_uso`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_nombre_unique` ON `marcas` (`nombre`);--> statement-breakpoint
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
ALTER TABLE `productos` ADD `tipo_vehiculo_id` integer REFERENCES tipos_vehiculo(id);--> statement-breakpoint
ALTER TABLE `productos` ADD `marca_id` integer REFERENCES marcas(id);--> statement-breakpoint
ALTER TABLE `productos` ADD `modelo_id` integer REFERENCES modelos(id);--> statement-breakpoint
ALTER TABLE `productos` ADD `tipo_uso_id` integer NOT NULL REFERENCES tipos_uso(id);--> statement-breakpoint
ALTER TABLE `productos` ADD `categoria_competencia_id` integer REFERENCES categorias_competencia(id);--> statement-breakpoint
ALTER TABLE `productos` ADD `updated_at` integer;