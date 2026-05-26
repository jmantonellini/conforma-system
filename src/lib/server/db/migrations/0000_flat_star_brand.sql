CREATE TABLE `empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`apellido` text NOT NULL,
	`rol` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `ordenes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_orden` text NOT NULL,
	`cliente_nombre` text NOT NULL,
	`tipo` text,
	`fecha_pedido` integer NOT NULL,
	`fecha_entrega_prometida` integer,
	`estado` text DEFAULT 'en_espera_seña' NOT NULL,
	`precio` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ordenes_numero_orden_unique` ON `ordenes` (`numero_orden`);--> statement-breakpoint
CREATE TABLE `permisos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permisos_nombre_unique` ON `permisos` (`nombre`);--> statement-breakpoint
CREATE TABLE `sesiones` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_username_unique` ON `usuarios` (`username`);