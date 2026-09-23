ALTER TABLE "contactos" DROP COLUMN IF EXISTS "tipo_compensacion";
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "porcentaje_comision_distribuidor" real DEFAULT 0;
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "monto_comision_distribuidor" real DEFAULT 0;