ALTER TABLE "contactos" ADD COLUMN "dni" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_modalidad" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_provincia" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_codigo_postal" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_indicaciones" text;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "entrega_consumidor_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD COLUMN "es_flete_recepcion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD COLUMN "es_flete_recepcion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_modalidad" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_provincia" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_codigo_postal" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_indicaciones" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "entrega_consumidor_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recepciones_pieza" ADD COLUMN "flete_pagado" numeric(14, 2);