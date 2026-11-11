CREATE TABLE "movimientos_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"insumo_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"fuente" text DEFAULT 'manual' NOT NULL,
	"cantidad" real NOT NULL,
	"orden_fabricacion_id" integer,
	"empleado_id" integer NOT NULL,
	"usuario_id" integer,
	"motivo" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "movimientos_insumos_cantidad_positiva" CHECK ("movimientos_insumos"."cantidad" > 0),
	CONSTRAINT "movimientos_insumos_motivo_requerido" CHECK (length(trim("movimientos_insumos"."motivo")) > 0),
	CONSTRAINT "movimientos_insumos_fuente_receta_valida" CHECK ("movimientos_insumos"."fuente" <> 'receta' OR ("movimientos_insumos"."tipo" = 'consumo' AND "movimientos_insumos"."orden_fabricacion_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "imagen_key" text;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_movimientos_insumos_receta_unica" ON "movimientos_insumos" USING btree ("orden_fabricacion_id","insumo_id") WHERE "movimientos_insumos"."fuente" = 'receta';--> statement-breakpoint
CREATE INDEX "idx_movimientos_insumos_insumo_fecha" ON "movimientos_insumos" USING btree ("insumo_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_movimientos_insumos_orden" ON "movimientos_insumos" USING btree ("orden_fabricacion_id");