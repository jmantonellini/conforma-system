SET LOCAL TIME ZONE 'UTC';--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"razon_social" text NOT NULL,
	"cuit" text,
	"direccion" text,
	"telefono" text,
	"email" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	CONSTRAINT "empresas_cuit_unique" UNIQUE("cuit")
);--> statement-breakpoint
INSERT INTO "empresas" ("razon_social", "cuit", "direccion", "telefono", "email", "logo_url", "created_at")
SELECT coalesce(nullif(trim("razon_social"), ''), 'Conforma'), nullif(trim("cuit"), ''), "direccion", "telefono", "email", "logo_url", now()
FROM "configuracion_empresa" ORDER BY "id" LIMIT 1;--> statement-breakpoint
INSERT INTO "empresas" ("razon_social") SELECT 'Conforma' WHERE NOT EXISTS (SELECT 1 FROM "empresas");--> statement-breakpoint
CREATE OR REPLACE FUNCTION empresa_actual() RETURNS integer LANGUAGE sql STABLE AS $$
	SELECT coalesce(nullif(current_setting('app.empresa_id', true), '')::integer, (SELECT min(id) FROM empresas))
$$;--> statement-breakpoint
CREATE TABLE "atributos_categoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer DEFAULT empresa_actual() NOT NULL,
	"categoria_id" integer NOT NULL,
	"clave" text NOT NULL,
	"etiqueta" text NOT NULL,
	"grupo" text,
	"tipo" text DEFAULT 'numero' NOT NULL,
	"unidad" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "atributos_categoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empleados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "estados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transiciones_estado" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contactos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categorias_competencia" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categorias_productos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marcas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "modelos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "producto_componentes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "producto_insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "productos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipos_uso" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipos_vehiculo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categorias_insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipos_insumo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unidades_medida" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cotizaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notas_cotizacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "envios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pagos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pedidos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transportistas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipos_material" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reservas_stock" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "adjuntos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "logs_sistema" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notificaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tareas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categorias_productos" DROP CONSTRAINT IF EXISTS "categorias_productos_nombre_unique";--> statement-breakpoint
ALTER TABLE "categorias_productos" DROP CONSTRAINT IF EXISTS "categorias_productos_slug_unique";--> statement-breakpoint
ALTER TABLE "contactos" DROP CONSTRAINT IF EXISTS "contactos_cuit_unique";--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP CONSTRAINT IF EXISTS "cotizaciones_numero_cotizacion_unique";--> statement-breakpoint
ALTER TABLE "empleados" DROP CONSTRAINT IF EXISTS "empleados_email_unique";--> statement-breakpoint
ALTER TABLE "empleados" DROP CONSTRAINT IF EXISTS "empleados_dni_unique";--> statement-breakpoint
ALTER TABLE "insumos" DROP CONSTRAINT IF EXISTS "insumos_codigo_unique";--> statement-breakpoint
ALTER TABLE "marcas" DROP CONSTRAINT IF EXISTS "marcas_nombre_unique";--> statement-breakpoint
ALTER TABLE "pedidos" DROP CONSTRAINT IF EXISTS "pedidos_numero_pedido_unique";--> statement-breakpoint
ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "productos_codigo_unique";--> statement-breakpoint
ALTER TABLE "proveedores" DROP CONSTRAINT IF EXISTS "proveedores_codigo_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_nombre_unique";--> statement-breakpoint
ALTER TABLE "tipos_insumo" DROP CONSTRAINT IF EXISTS "tipos_insumo_codigo_unique";--> statement-breakpoint
ALTER TABLE "tipos_insumo" DROP CONSTRAINT IF EXISTS "tipos_insumo_nombre_unique";--> statement-breakpoint
ALTER TABLE "tipos_material" DROP CONSTRAINT IF EXISTS "tipos_material_nombre_unique";--> statement-breakpoint
ALTER TABLE "tipos_uso" DROP CONSTRAINT IF EXISTS "tipos_uso_slug_unique";--> statement-breakpoint
ALTER TABLE "tipos_vehiculo" DROP CONSTRAINT IF EXISTS "tipos_vehiculo_slug_unique";--> statement-breakpoint
ALTER TABLE "unidades_medida" DROP CONSTRAINT IF EXISTS "unidades_medida_codigo_unique";--> statement-breakpoint
ALTER TABLE "unidades_medida" DROP CONSTRAINT IF EXISTS "unidades_medida_nombre_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_estados_flujo_slug";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_estados_flujo_nombre";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_ubicaciones_stock_deposito";--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" DROP COLUMN "subtotal";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN "subtotal";--> statement-breakpoint
ALTER TABLE "materiales_empleados" DROP COLUMN "costo_total";--> statement-breakpoint
ALTER TABLE "adjuntos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "adjuntos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categorias_insumos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "categorias_insumos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categorias_productos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "categorias_productos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "contactos" ALTER COLUMN "porcentaje_compensacion" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "contactos" ALTER COLUMN "saldo_disponible" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "contactos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contactos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "contactos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "precio_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "descuento_global_porcentaje" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "fecha_envio" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cotizaciones" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "empleados" ALTER COLUMN "fecha_ingreso" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "empleados" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "empleados" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "envios" ALTER COLUMN "fecha_envio" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "envios" ALTER COLUMN "fecha_entrega" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "envios" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "envios" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "estados" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "estados" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "insumos" ALTER COLUMN "costo_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "insumos" ALTER COLUMN "flete_porcentaje" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "insumos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "insumos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "insumos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "precio_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "precio_lista_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "margen_porcentaje" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "costo_materiales" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "fecha_envio_parcial" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "precio_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "precio_lista_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "margen_porcentaje" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "costo_materiales" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "lineas_pedido" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "logs_sistema" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "logs_sistema" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "materiales_empleados" ALTER COLUMN "cantidad" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "materiales_empleados" ALTER COLUMN "costo_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "materiales_empleados" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ALTER COLUMN "cantidad" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "movimientos_stock" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notas_cotizacion" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notas_cotizacion" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notificaciones" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notificaciones" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "fecha_inicio" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "fecha_fin_estimada" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "fecha_fin_real" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "monto" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "fecha_pago" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "fecha_pago" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pagos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "cantidad" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "cantidad" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "costo_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "precio_lista_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "precio_unitario" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pedido_insumos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "monto_credito_distribuidor" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "porcentaje_comision_distribuidor" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "monto_comision_distribuidor" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "fecha_pedido" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "fecha_entrega_prometida" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "fecha_entrega_real" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "precio_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "anticipo" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pedidos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "permisos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "permisos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "producto_componentes" ALTER COLUMN "cantidad" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "producto_componentes" ALTER COLUMN "cantidad" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "producto_componentes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "producto_componentes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "producto_insumos" ALTER COLUMN "cantidad" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "producto_insumos" ALTER COLUMN "cantidad" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "producto_insumos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "producto_insumos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "producto_insumos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "productos" ALTER COLUMN "margen_porcentaje" SET DATA TYPE numeric(7, 4);--> statement-breakpoint
ALTER TABLE "productos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "productos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "productos" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proveedores" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proveedores" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "proveedores" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservas_stock" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservas_stock" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reservas_stock" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles_permisos" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "roles_permisos" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sesiones" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sesiones" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sesiones" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tareas" ALTER COLUMN "fecha_entrega" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tareas" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tareas" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tareas" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tipos_insumo" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tipos_insumo" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tipos_material" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tipos_material" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transiciones_estado" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transiciones_estado" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transportistas" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transportistas" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unidades_medida" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unidades_medida" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "ultimo_acceso" SET DATA TYPE timestamp with time zone USING to_timestamp("ultimo_acceso");--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "adjuntos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias_competencia" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias_insumos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias_productos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "contactos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "empleados" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "envios" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "estados" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD COLUMN "atributos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "logs_sistema" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "marcas" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "notas_cotizacion" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "producto_componentes" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "producto_insumos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "atributos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "notas_fabricacion" text;--> statement-breakpoint
ALTER TABLE "proveedores" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "reservas_stock" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "creada_por" integer;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "completada_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tipos_insumo" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "tipos_material" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "tipos_uso" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "tipos_vehiculo" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "transiciones_estado" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "transportistas" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "unidades_medida" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "empresa_id" integer DEFAULT empresa_actual() NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "atributos_categoria" ADD CONSTRAINT "atributos_categoria_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atributos_categoria" ADD CONSTRAINT "atributos_categoria_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_atributos_categoria_clave" ON "atributos_categoria" USING btree ("categoria_id","clave");--> statement-breakpoint
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_competencia" ADD CONSTRAINT "categorias_competencia_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_insumos" ADD CONSTRAINT "categorias_insumos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_productos" ADD CONSTRAINT "categorias_productos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envios" ADD CONSTRAINT "envios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados" ADD CONSTRAINT "estados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ADD CONSTRAINT "logs_cambios_estado_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_sistema" ADD CONSTRAINT "logs_sistema_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcas" ADD CONSTRAINT "marcas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ADD CONSTRAINT "materiales_empleados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_cotizacion" ADD CONSTRAINT "notas_cotizacion_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_componentes" ADD CONSTRAINT "producto_componentes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_insumos" ADD CONSTRAINT "producto_insumos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas_stock" ADD CONSTRAINT "reservas_stock_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creada_por_usuarios_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_insumo" ADD CONSTRAINT "tipos_insumo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_material" ADD CONSTRAINT "tipos_material_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_uso" ADD CONSTRAINT "tipos_uso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_vehiculo" ADD CONSTRAINT "tipos_vehiculo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transiciones_estado" ADD CONSTRAINT "transiciones_estado_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transportistas" ADD CONSTRAINT "transportistas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ubicaciones_stock" ADD CONSTRAINT "ubicaciones_stock_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categorias_productos_empresa_nombre" ON "categorias_productos" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categorias_productos_empresa_slug" ON "categorias_productos" USING btree ("empresa_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contactos_empresa_cuit" ON "contactos" USING btree ("empresa_id","cuit");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cotizaciones_empresa_numero" ON "cotizaciones" USING btree ("empresa_id","numero_cotizacion");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_empleados_empresa_email" ON "empleados" USING btree ("empresa_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_empleados_empresa_dni" ON "empleados" USING btree ("empresa_id","dni");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_insumos_empresa_codigo" ON "insumos" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marcas_empresa_nombre" ON "marcas" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pedidos_empresa_numero" ON "pedidos" USING btree ("empresa_id","numero_pedido");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_productos_empresa_codigo" ON "productos" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_proveedores_empresa_codigo" ON "proveedores" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_empresa_nombre" ON "roles" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE INDEX "idx_tareas_estado" ON "tareas" USING btree ("empresa_id","archivada","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tipos_insumo_empresa_codigo" ON "tipos_insumo" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tipos_insumo_empresa_nombre" ON "tipos_insumo" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tipos_material_empresa_nombre" ON "tipos_material" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tipos_uso_empresa_slug" ON "tipos_uso" USING btree ("empresa_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tipos_vehiculo_empresa_slug" ON "tipos_vehiculo" USING btree ("empresa_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unidades_medida_empresa_codigo" ON "unidades_medida" USING btree ("empresa_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unidades_medida_empresa_nombre" ON "unidades_medida" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_estados_flujo_slug" ON "estados" USING btree ("empresa_id","flujo","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_estados_flujo_nombre" ON "estados" USING btree ("empresa_id","flujo","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ubicaciones_stock_deposito" ON "ubicaciones_stock" USING btree ("empresa_id","tipo") WHERE "ubicaciones_stock"."tipo" = 'deposito';--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "adjuntos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "categorias_competencia" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "categorias_insumos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "categorias_productos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "contactos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "cotizaciones" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "empleados" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "envios" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "estados" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "feedback" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "insumos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "lineas_cotizacion" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "lineas_pedido" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "logs_cambios_estado" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "logs_sistema" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "marcas" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "materiales_empleados" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "modelos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "movimientos_insumos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "movimientos_stock" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "notas_cotizacion" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "notificaciones" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "ordenes_fabricacion" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "pagos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "pedido_insumos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "pedidos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "producto_componentes" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "producto_insumos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "productos" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "proveedores" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "reservas_stock" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "roles" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "tareas" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "tipos_insumo" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "tipos_material" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "tipos_uso" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "tipos_vehiculo" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "transiciones_estado" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "transportistas" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "ubicaciones_stock" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "unidades_fabricacion" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "unidades_medida" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
CREATE POLICY "aislamiento_empresa" ON "atributos_categoria" AS PERMISSIVE FOR ALL TO public USING (empresa_id = empresa_actual()) WITH CHECK (empresa_id = empresa_actual());--> statement-breakpoint
ALTER TABLE "lineas_cotizacion" ADD COLUMN "subtotal" numeric(14, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD COLUMN "subtotal" numeric(14, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ADD COLUMN "costo_total" numeric(14, 2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED;--> statement-breakpoint
UPDATE "insumos" i SET "tipo_id" = t."id" FROM "tipos_insumo" t WHERE i."tipo_id" IS NULL AND t."codigo" = i."tipo";--> statement-breakpoint
UPDATE "insumos" i SET "unidad_id" = u."id" FROM "unidades_medida" u WHERE i."unidad_id" IS NULL AND u."codigo" = i."unidad";--> statement-breakpoint
UPDATE "productos" SET
	"atributos" = jsonb_strip_nulls(jsonb_build_object(
		'primario_diametro', nullif("medidas_primario_diametro", 0),
		'primario_largo', nullif("medidas_primario_largo", 0),
		'secundario_diametro', nullif("medidas_secundario_diametro", 0),
		'secundario_largo', nullif("medidas_secundario_largo", 0),
		'trombon_diametro_inicial', nullif("trombon_diametro_inicial", 0),
		'trombon_diametro_final', nullif("trombon_diametro_final", 0),
		'trombon_largo', nullif("trombon_largo", 0)
	)),
	"notas_fabricacion" = nullif(trim("trombon_observaciones"), '');--> statement-breakpoint
UPDATE "lineas_pedido" SET
	"atributos" = jsonb_strip_nulls(jsonb_build_object(
		'primario_diametro', nullif("medidas_primario_diametro", 0),
		'primario_largo', nullif("medidas_primario_largo", 0),
		'secundario_diametro', nullif("medidas_secundario_diametro", 0),
		'secundario_largo', nullif("medidas_secundario_largo", 0),
		'trombon_diametro_inicial', nullif("trombon_diametro_inicial", 0),
		'trombon_largo', nullif("trombon_largo", 0)
	));--> statement-breakpoint
DROP TABLE IF EXISTS "configuracion_empresa" CASCADE;--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "medidas_primario_diametro";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "medidas_primario_largo";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "medidas_secundario_diametro";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "medidas_secundario_largo";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "trombon_diametro_inicial";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "trombon_largo";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "trombon_observaciones";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "trombon_diametro_final";--> statement-breakpoint
ALTER TABLE "insumos" DROP COLUMN IF EXISTS "tipo";--> statement-breakpoint
ALTER TABLE "insumos" DROP COLUMN IF EXISTS "unidad";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "medidas_primario_diametro";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "medidas_primario_largo";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "medidas_secundario_diametro";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "medidas_secundario_largo";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "trombon_diametro_inicial";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "trombon_largo";--> statement-breakpoint
ALTER TABLE "lineas_pedido" DROP COLUMN IF EXISTS "trombon_observaciones";--> statement-breakpoint
ALTER TABLE "pedidos" DROP COLUMN IF EXISTS "saldo_pendiente";
