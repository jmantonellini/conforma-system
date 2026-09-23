ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "nombre" text;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "apellido" text;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tipo_compensacion" text DEFAULT 'comision';
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "porcentaje_compensacion" real DEFAULT 0;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "saldo_disponible" real DEFAULT 0;