PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_productos` (
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
INSERT INTO `__new_productos`("id", "codigo", "nombre", "categoria_id", "medidas_primario_diametro", "medidas_primario_largo", "medidas_secundario_diametro", "medidas_secundario_largo", "trombon_diametro_inicial", "trombon_largo", "trombon_observaciones", "tipo_vehiculo_id", "marca_id", "modelo_id", "tipo_uso_id", "categoria_competencia_id", "precio_base", "es_personalizable", "activo", "created_at", "updated_at") SELECT "id", "codigo", "nombre", "categoria_id", "medidas_primario_diametro", "medidas_primario_largo", "medidas_secundario_diametro", "medidas_secundario_largo", "trombon_diametro_inicial", "trombon_largo", "trombon_observaciones", "tipo_vehiculo_id", "marca_id", "modelo_id", "tipo_uso_id", "categoria_competencia_id", "precio_base", "es_personalizable", "activo", "created_at", "updated_at" FROM `productos`;--> statement-breakpoint
DROP TABLE `productos`;--> statement-breakpoint
ALTER TABLE `__new_productos` RENAME TO `productos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `productos_codigo_unique` ON `productos` (`codigo`);