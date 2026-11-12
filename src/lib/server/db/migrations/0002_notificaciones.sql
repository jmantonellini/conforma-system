ALTER TABLE "pedidos" ADD COLUMN "creado_por" integer;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD COLUMN "modulo" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notificaciones_usuario" ON "notificaciones" USING btree ("usuario_id","leida");--> statement-breakpoint
UPDATE "notificaciones" SET "modulo" = 'cotizacion' WHERE "link" LIKE '/cotizaciones/%';--> statement-breakpoint
UPDATE "pedidos" p SET "creado_por" = c."creada_por" FROM "cotizaciones" c WHERE c."pedido_id" = p."id" AND p."creado_por" IS NULL;--> statement-breakpoint
UPDATE "pedidos" p SET "creado_por" = l."usuario_id"
FROM (
	SELECT DISTINCT ON ("entidad_id") "entidad_id", "usuario_id"
	FROM "logs_cambios_estado"
	WHERE "entidad_tipo" = 'pedido'
	ORDER BY "entidad_id", "created_at"
) l
WHERE l."entidad_id" = p."id" AND p."creado_por" IS NULL;
