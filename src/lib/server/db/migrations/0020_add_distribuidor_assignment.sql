ALTER TABLE "cotizaciones" ADD COLUMN "empresa_distribuidor_id" integer;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "empresa_distribuidor_id" integer;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "usar_credito_distribuidor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "monto_credito_distribuidor" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_distribuidor_id_empresas_id_fk" FOREIGN KEY ("empresa_distribuidor_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresa_distribuidor_id_empresas_id_fk" FOREIGN KEY ("empresa_distribuidor_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;