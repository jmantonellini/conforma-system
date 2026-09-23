ALTER TABLE "empresas" ADD COLUMN "es_distribuidor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "tipo_compensacion" text DEFAULT 'comision';--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "porcentaje_compensacion" real DEFAULT 0;