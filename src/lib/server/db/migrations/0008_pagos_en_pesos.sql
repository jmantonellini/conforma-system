ALTER TABLE "pagos" ADD COLUMN "moneda" text DEFAULT 'ARS' NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "tipo_cambio" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "monto_aplicado" numeric(14, 2);--> statement-breakpoint
UPDATE "pagos" SET "moneda" = "pedidos"."moneda", "monto_aplicado" = "pagos"."monto" FROM "pedidos" WHERE "pedidos"."id" = "pagos"."pedido_id";--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "monto_aplicado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "recibo" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "factura" text;--> statement-breakpoint
CREATE INDEX "idx_pagos_pedido" ON "pagos" USING btree ("pedido_id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_moneda_valida" CHECK ("pagos"."moneda" IN ('USD', 'ARS'));--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tipo_cambio_positivo" CHECK ("pagos"."tipo_cambio" IS NULL OR "pagos"."tipo_cambio" > 0);