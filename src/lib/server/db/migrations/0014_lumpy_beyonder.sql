ALTER TABLE "cotizaciones" DROP CONSTRAINT "cotizaciones_cliente_id_clientes_id_fk";
--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_cliente_id_clientes_id_fk";
--> statement-breakpoint
ALTER TABLE "clientes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "clientes" CASCADE;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "empresa_id" integer;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "es_cliente" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "empresa_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP COLUMN "cliente_id";--> statement-breakpoint
ALTER TABLE "pedidos" DROP COLUMN "cliente_id";