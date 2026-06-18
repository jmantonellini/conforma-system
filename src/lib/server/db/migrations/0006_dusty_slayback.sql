PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_permisos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`modulo` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_permisos`("id", "nombre", "modulo", "created_at") SELECT "id", "nombre", "modulo", "created_at" FROM `permisos`;--> statement-breakpoint
DROP TABLE `permisos`;--> statement-breakpoint
ALTER TABLE `__new_permisos` RENAME TO `permisos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;