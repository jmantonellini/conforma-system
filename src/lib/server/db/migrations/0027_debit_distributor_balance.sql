ALTER TABLE "pedidos"
ADD COLUMN IF NOT EXISTS "comision_distribuidor_descontada" boolean DEFAULT false;