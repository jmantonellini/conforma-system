CREATE TABLE "categorias_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"padre_id" integer,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tipos_insumo" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tipos_insumo_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_insumo_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "unidades_medida" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"dimension" text NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unidades_medida_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "unidades_medida_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
INSERT INTO "tipos_insumo" ("codigo", "nombre") VALUES
	('material', 'Material'),
	('mano_obra', 'Mano de obra'),
	('indirecto', 'Costo indirecto'),
	('herramienta', 'Herramienta')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "unidades_medida" ("codigo", "nombre", "dimension") VALUES
	('unidad', 'Unidad', 'cantidad'),
	('metro', 'Metro', 'longitud'),
	('m2', 'Metro cuadrado', 'superficie'),
	('m3', 'Metro cúbico', 'volumen'),
	('kg', 'Kilogramo', 'masa'),
	('gramo', 'Gramo', 'masa'),
	('litro', 'Litro', 'volumen'),
	('hora', 'Hora', 'tiempo'),
	('dia', 'Día', 'tiempo')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "categorias_insumos" ("nombre", "descripcion") VALUES
	('Caños', 'Caños y tubos'),
	('Bridas', 'Bridas y uniones'),
	('Consumibles', 'Electrodos, discos y consumibles'),
	('Herramientas', 'Herramientas y alquileres')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "tipo_id" integer;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "categoria_id" integer;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "unidad_id" integer;--> statement-breakpoint
UPDATE "insumos" AS i
SET "tipo_id" = t."id"
FROM "tipos_insumo" AS t
WHERE t."codigo" = i."tipo";
--> statement-breakpoint
UPDATE "insumos" AS i
SET "unidad_id" = u."id"
FROM "unidades_medida" AS u
WHERE u."codigo" = i."unidad";
--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_tipo_id_tipos_insumo_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_insumo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_categoria_id_categorias_insumos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_insumos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_unidad_id_unidades_medida_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE restrict ON UPDATE no action;