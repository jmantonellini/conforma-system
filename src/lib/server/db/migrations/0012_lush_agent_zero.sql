CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"razon_social" text NOT NULL,
	"cuit" text,
	"email" text,
	"telefono" text,
	"pais" text DEFAULT 'Argentina',
	"provincia" text,
	"ciudad" text,
	"codigo_postal" text,
	"calle" text,
	"numero" text,
	"piso" text,
	"departamento" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "empresas_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"codigo" text,
	"contacto_nombre" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"condiciones_pago" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "proveedores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "empresa_id" integer;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "proveedor_id" integer;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_proveedor_empresa" ON "proveedores" USING btree ("empresa_id");--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE no action;