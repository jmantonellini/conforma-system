PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clientes` (
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
INSERT INTO `__new_clientes`("id", "nombre", "razon_social", "cuit", "email", "telefono", "pais", "provincia", "ciudad", "codigo_postal", "calle", "numero", "piso", "departamento", "activo", "created_at", "updated_at") SELECT "id", "nombre", "razon_social", "cuit", "email", "telefono", "pais", "provincia", "ciudad", "codigo_postal", "calle", "numero", "piso", "departamento", "activo", "created_at", "updated_at" FROM `clientes`;--> statement-breakpoint
DROP TABLE `clientes`;--> statement-breakpoint
ALTER TABLE `__new_clientes` RENAME TO `clientes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_cuit_unique` ON `clientes` (`cuit`);