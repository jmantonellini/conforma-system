CREATE TABLE "adjuntos_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"archivo_url" text NOT NULL,
	"mime_type" text,
	"tamano_bytes" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cotizaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_cotizacion" text NOT NULL,
	"cliente_id" integer,
	"cliente_nombre" text NOT NULL,
	"cliente_telefono" text,
	"cliente_email" text,
	"canal" text DEFAULT 'whatsapp' NOT NULL,
	"descripcion" text NOT NULL,
	"estado_id" integer NOT NULL,
	"asignada_a" integer,
	"creada_por" integer,
	"precio_total" real,
	"validez_dias" integer DEFAULT 15,
	"fecha_envio" timestamp,
	"pedido_id" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "cotizaciones_numero_cotizacion_unique" UNIQUE("numero_cotizacion")
);
--> statement-breakpoint
CREATE TABLE "estados_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"grupo" text NOT NULL,
	"orden" integer NOT NULL,
	"color" text,
	"es_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "estados_cotizacion_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "estados_cotizacion_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lineas_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer NOT NULL,
	"producto_id" integer,
	"es_personalizado" boolean DEFAULT false,
	"descripcion" text NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario" real NOT NULL,
	"subtotal" real GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
	"costo_mano_obra" real,
	"costo_materiales" real,
	"orden_linea" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"mensaje" text,
	"link" text,
	"leida" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "adjuntos_cotizacion" ADD CONSTRAINT "adjuntos_cotizacion_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_estado_id_estados_cotizacion_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_cotizacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_asignada_a_empleados_id_fk" FOREIGN KEY ("asignada_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creada_por_usuarios_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adjuntos_cotizacion" ON "adjuntos_cotizacion" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX "idx_lineas_cotizacion" ON "lineas_cotizacion" USING btree ("cotizacion_id");