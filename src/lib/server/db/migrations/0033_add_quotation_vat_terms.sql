ALTER TABLE "cotizaciones" ADD COLUMN "incluir_iva" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "condiciones_pago" text;