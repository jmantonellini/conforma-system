ALTER TABLE "unidades_fabricacion" ADD COLUMN "numero" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unidades_empresa_numero" ON "unidades_fabricacion" USING btree ("empresa_id","numero");