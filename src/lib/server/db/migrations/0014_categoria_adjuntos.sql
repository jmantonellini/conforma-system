ALTER TABLE "adjuntos" ADD COLUMN "categoria" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
UPDATE "adjuntos" SET "categoria" = 'plano' WHERE "es_plano";--> statement-breakpoint
ALTER TABLE "adjuntos" DROP COLUMN "es_plano";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_adjuntos_portada_producto" ON "adjuntos" USING btree ("producto_id") WHERE "adjuntos"."categoria" = 'portada';
