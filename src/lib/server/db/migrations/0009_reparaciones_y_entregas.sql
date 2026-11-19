CREATE TABLE "recepciones_pieza" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer DEFAULT empresa_actual() NOT NULL,
	"cotizacion_id" integer,
	"pedido_id" integer,
	"fecha_recepcion" timestamp with time zone DEFAULT now() NOT NULL,
	"recibido_por" integer,
	"llego_por" text,
	"numero_guia" text,
	"estado_pieza" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	CONSTRAINT "recepciones_un_solo_propietario" CHECK (num_nonnulls(cotizacion_id, pedido_id) = 1)
);
--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_transportista" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_direccion" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_localidad" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_recibe" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_telefono" text;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "tipo_trabajo" text DEFAULT 'fabricacion' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "tipo_trabajo" text DEFAULT 'fabricacion' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_transportista" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_direccion" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_localidad" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_recibe" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_telefono" text;--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ADD CONSTRAINT "recepciones_pieza_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ADD CONSTRAINT "recepciones_pieza_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ADD CONSTRAINT "recepciones_pieza_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ADD CONSTRAINT "recepciones_pieza_recibido_por_usuarios_id_fk" FOREIGN KEY ("recibido_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recepciones_cotizacion" ON "recepciones_pieza" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recepciones_pedido" ON "recepciones_pieza" USING btree ("pedido_id");--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "recepciones_pieza" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());