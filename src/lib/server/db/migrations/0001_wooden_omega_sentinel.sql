PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_pedido` text NOT NULL,
	`cliente_id` integer NOT NULL,
	`fecha_pedido` integer NOT NULL,
	`fecha_entrega_prometida` integer,
	`fecha_entrega_real` integer,
	`estado_id` integer NOT NULL,
	`precio_total` real,
	`seña` real,
	`saldo_pendiente` real,
	`observaciones` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`estado_id`) REFERENCES `estados_pedido`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_pedidos`("id", "numero_pedido", "cliente_id", "fecha_pedido", "fecha_entrega_prometida", "fecha_entrega_real", "estado_id", "precio_total", "seña", "saldo_pendiente", "observaciones", "created_at", "updated_at") SELECT "id", "numero_pedido", "cliente_id", "fecha_pedido", "fecha_entrega_prometida", "fecha_entrega_real", "estado_id", "precio_total", "seña", "saldo_pendiente", "observaciones", "created_at", "updated_at" FROM `pedidos`;--> statement-breakpoint
DROP TABLE `pedidos`;--> statement-breakpoint
ALTER TABLE `__new_pedidos` RENAME TO `pedidos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pedidos_numero_pedido_unique` ON `pedidos` (`numero_pedido`);--> statement-breakpoint
ALTER TABLE `logs_pedidos` ADD `user_agent` text;