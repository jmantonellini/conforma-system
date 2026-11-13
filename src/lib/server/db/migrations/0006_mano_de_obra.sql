ALTER TABLE "tipos_insumo" ADD COLUMN "controla_stock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "tipos_insumo" SET "controla_stock" = false WHERE "codigo" IN ('mano_obra', 'indirecto');
