CREATE TABLE "lotes_consumo" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer DEFAULT empresa_actual() NOT NULL,
	"empleado_id" integer NOT NULL,
	"orden_fabricacion_id" integer,
	"usuario_id" integer,
	"motivo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lotes_consumo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD COLUMN "lote_id" integer;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "moneda" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "tipo_cambio" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "moneda" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "tipo_cambio" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "logs_sistema" ADD COLUMN "entidad" text;--> statement-breakpoint
ALTER TABLE "logs_sistema" ADD COLUMN "entidad_id" integer;--> statement-breakpoint
ALTER TABLE "lotes_consumo" ADD CONSTRAINT "lotes_consumo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_consumo" ADD CONSTRAINT "lotes_consumo_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_consumo" ADD CONSTRAINT "lotes_consumo_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_consumo" ADD CONSTRAINT "lotes_consumo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lotes_consumo_orden" ON "lotes_consumo" USING btree ("orden_fabricacion_id");--> statement-breakpoint
CREATE INDEX "idx_lotes_consumo_fecha" ON "lotes_consumo" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_lote_id_lotes_consumo_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes_consumo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_movimientos_insumos_lote" ON "movimientos_insumos" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "idx_logs_sistema_entidad" ON "logs_sistema" USING btree ("entidad","entidad_id");--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_moneda_valida" CHECK ("cotizaciones"."moneda" IN ('USD', 'ARS'));--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_ars_con_cambio" CHECK ("cotizaciones"."moneda" = 'USD' OR "cotizaciones"."tipo_cambio" > 0);--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_moneda_valida" CHECK ("pedidos"."moneda" IN ('USD', 'ARS'));--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_ars_con_cambio" CHECK ("pedidos"."moneda" = 'USD' OR "pedidos"."tipo_cambio" > 0);--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "lotes_consumo" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());