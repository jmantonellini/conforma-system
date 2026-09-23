ALTER TABLE IF EXISTS "empresas" RENAME TO "contactos";

ALTER TABLE "cotizaciones" RENAME COLUMN "empresa_id" TO "contacto_id";
ALTER TABLE "cotizaciones" RENAME COLUMN "empresa_distribuidor_id" TO "contacto_distribuidor_id";
ALTER TABLE "pedidos" RENAME COLUMN "empresa_id" TO "contacto_id";
ALTER TABLE "pedidos" RENAME COLUMN "empresa_distribuidor_id" TO "contacto_distribuidor_id";
ALTER TABLE "proveedores" RENAME COLUMN "empresa_id" TO "contacto_id";