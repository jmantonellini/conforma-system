CREATE TABLE IF NOT EXISTS "adjuntos_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"archivo_url" text NOT NULL,
	"mime_type" text,
	"tamano_bytes" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categorias_competencia" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"tipo_vehiculo_id" integer NOT NULL,
	"activa_desde" integer,
	"activa_hasta" integer,
	"vigente" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categorias_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"padre_id" integer,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categorias_productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categorias_productos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "configuracion_empresa" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"razon_social" text DEFAULT 'Conforma' NOT NULL,
	"cuit" text,
	"direccion" text,
	"telefono" text,
	"email" text,
	"logo_url" text,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contactos" (
	"id" serial PRIMARY KEY NOT NULL,
	"razon_social" text NOT NULL,
	"nombre" text,
	"apellido" text,
	"cuit" text,
	"email" text,
	"telefono" text,
	"pais" text DEFAULT 'Argentina',
	"provincia" text,
	"ciudad" text,
	"codigo_postal" text,
	"calle" text,
	"numero" text,
	"piso" text,
	"departamento" text,
	"es_cliente" boolean DEFAULT false,
	"es_distribuidor" boolean DEFAULT false,
	"porcentaje_compensacion" real DEFAULT 0,
	"saldo_disponible" real DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "contactos_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cotizaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_cotizacion" text NOT NULL,
	"contacto_id" integer NOT NULL,
	"contacto_distribuidor_id" integer,
	"canal" text DEFAULT 'whatsapp' NOT NULL,
	"descripcion" text NOT NULL,
	"estado_id" integer NOT NULL,
	"asignada_a" integer,
	"creada_por" integer,
	"precio_total" real,
	"descuento_global_porcentaje" real DEFAULT 0 NOT NULL,
	"incluir_iva" boolean DEFAULT false NOT NULL,
	"condiciones_pago" text,
	"validez_dias" integer DEFAULT 15,
	"fecha_envio" timestamp,
	"pedido_id" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "cotizaciones_numero_cotizacion_unique" UNIQUE("numero_cotizacion")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "empleados" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text,
	"telefono" text,
	"dni" text,
	"direccion" text,
	"fecha_ingreso" timestamp,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "empleados_email_unique" UNIQUE("email"),
	CONSTRAINT "empleados_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "envios" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"transportista_id" integer NOT NULL,
	"numero_guia" text,
	"cantidad_bultos" integer DEFAULT 1,
	"estado" text DEFAULT 'preparado' NOT NULL,
	"fecha_envio" timestamp,
	"fecha_entrega" timestamp,
	"observaciones" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estados_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"grupo" text NOT NULL,
	"orden" integer NOT NULL,
	"color" text,
	"es_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "estados_cotizacion_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "estados_cotizacion_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estados_fabricacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"grupo" text NOT NULL,
	"orden" integer NOT NULL,
	"color" text,
	"es_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "estados_fabricacion_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "estados_fabricacion_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "estados_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"grupo" text NOT NULL,
	"orden" integer NOT NULL,
	"color" text,
	"es_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "estados_pedido_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "estados_pedido_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"mensaje" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"proveedor_id" integer,
	"tipo_id" integer,
	"categoria_id" integer,
	"unidad_id" integer,
	"tipo" text DEFAULT 'material' NOT NULL,
	"unidad" text DEFAULT 'unidad' NOT NULL,
	"costo_unitario" real DEFAULT 0 NOT NULL,
	"flete_porcentaje" real DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "insumos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lineas_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer NOT NULL,
	"producto_id" integer,
	"insumo_id" integer,
	"es_personalizado" boolean DEFAULT false,
	"descripcion" text NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario" real NOT NULL,
	"subtotal" real GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
	"precio_lista_unitario" real DEFAULT 0 NOT NULL,
	"margen_porcentaje" real DEFAULT 0 NOT NULL,
	"descuento_porcentaje" real DEFAULT 0 NOT NULL,
	"justificacion_descuento" text,
	"descuento_usuario_id" integer,
	"costo_mano_obra" real,
	"costo_materiales" real DEFAULT 0 NOT NULL,
	"insumos_snapshot" jsonb,
	"orden_linea" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "lineas_cotizacion_descuento_range" CHECK ("lineas_cotizacion"."descuento_porcentaje" >= 0 AND "lineas_cotizacion"."descuento_porcentaje" < 100),
	CONSTRAINT "lineas_cotizacion_descuento_reason" CHECK ("lineas_cotizacion"."descuento_porcentaje" = 0 OR length(trim(coalesce("lineas_cotizacion"."justificacion_descuento", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lineas_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"producto_id" integer,
	"es_personalizado" boolean DEFAULT false,
	"descripcion_personalizada" text,
	"fecha_envio_parcial" timestamp,
	"medidas_primario_diametro" integer,
	"medidas_primario_largo" integer,
	"medidas_secundario_diametro" integer,
	"medidas_secundario_largo" integer,
	"trombon_diametro_inicial" integer,
	"trombon_largo" integer,
	"trombon_observaciones" text,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario" real NOT NULL,
	"subtotal" real GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
	"precio_lista_unitario" real DEFAULT 0 NOT NULL,
	"margen_porcentaje" real DEFAULT 0 NOT NULL,
	"descuento_porcentaje" real DEFAULT 0 NOT NULL,
	"justificacion_descuento" text,
	"descuento_usuario_id" integer,
	"costo_materiales" real DEFAULT 0 NOT NULL,
	"insumos_snapshot" jsonb,
	"orden_linea" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "lineas_pedido_descuento_range" CHECK ("lineas_pedido"."descuento_porcentaje" >= 0 AND "lineas_pedido"."descuento_porcentaje" < 100),
	CONSTRAINT "lineas_pedido_descuento_reason" CHECK ("lineas_pedido"."descuento_porcentaje" = 0 OR length(trim(coalesce("lineas_pedido"."justificacion_descuento", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs_cambios_estado" (
	"id" serial PRIMARY KEY NOT NULL,
	"entidad_tipo" text NOT NULL,
	"entidad_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"estado_anterior_id" integer,
	"estado_nuevo_id" integer NOT NULL,
	"comentario" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs_sistema" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"accion" text NOT NULL,
	"detalles" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marcas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"logo_url" text,
	"activo" boolean DEFAULT true,
	CONSTRAINT "marcas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "materiales_empleados" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_fabricacion_id" integer NOT NULL,
	"tipo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"cantidad" real NOT NULL,
	"unidad" text NOT NULL,
	"costo_unitario" real,
	"costo_total" real GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
	"observaciones" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modelos" (
	"id" serial PRIMARY KEY NOT NULL,
	"marca_id" integer NOT NULL,
	"tipo_vehiculo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"anio_desde" integer,
	"anio_hasta" integer,
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notas_cotizacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"cotizacion_id" integer NOT NULL,
	"usuario_id" integer,
	"contenido" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"mensaje" text,
	"link" text,
	"leida" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordenes_fabricacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"linea_pedido_id" integer NOT NULL,
	"nombre_trabajo" text NOT NULL,
	"cantidad_total" integer DEFAULT 1 NOT NULL,
	"prioridad" integer DEFAULT 0,
	"fecha_inicio" timestamp,
	"fecha_fin_estimada" timestamp,
	"fecha_fin_real" timestamp,
	"asignado_a" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "ordenes_fabricacion_linea_pedido_id_unique" UNIQUE("linea_pedido_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"monto" real NOT NULL,
	"fecha_pago" timestamp DEFAULT now(),
	"metodo_pago" text,
	"observaciones" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pedido_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" integer NOT NULL,
	"insumo_id" integer NOT NULL,
	"cantidad" real DEFAULT 1 NOT NULL,
	"unidad" text NOT NULL,
	"costo_unitario" real,
	"precio_lista_unitario" real DEFAULT 0 NOT NULL,
	"precio_unitario" real DEFAULT 0 NOT NULL,
	"descuento_porcentaje" real DEFAULT 0 NOT NULL,
	"justificacion_descuento" text,
	"descuento_usuario_id" integer,
	"cotizacion_linea_id" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "pedido_insumos_descuento_range" CHECK ("pedido_insumos"."descuento_porcentaje" >= 0 AND "pedido_insumos"."descuento_porcentaje" < 100),
	CONSTRAINT "pedido_insumos_descuento_reason" CHECK ("pedido_insumos"."descuento_porcentaje" = 0 OR length(trim(coalesce("pedido_insumos"."justificacion_descuento", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_pedido" text NOT NULL,
	"contacto_id" integer NOT NULL,
	"contacto_distribuidor_id" integer,
	"usar_credito_distribuidor" boolean DEFAULT false,
	"monto_credito_distribuidor" real DEFAULT 0,
	"porcentaje_comision_distribuidor" real DEFAULT 0,
	"monto_comision_distribuidor" real DEFAULT 0,
	"comision_distribuidor_descontada" boolean DEFAULT false,
	"fecha_pedido" timestamp NOT NULL,
	"fecha_entrega_prometida" timestamp,
	"fecha_entrega_real" timestamp,
	"estado_id" integer NOT NULL,
	"precio_total" real,
	"anticipo" real,
	"saldo_pendiente" real,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "pedidos_numero_pedido_unique" UNIQUE("numero_pedido")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permisos" (
	"id" serial PRIMARY KEY NOT NULL,
	"accion" text NOT NULL,
	"modulo" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "producto_componentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"componente_id" integer NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "producto_insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"insumo_id" integer NOT NULL,
	"cantidad" real DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"categoria_id" integer,
	"medidas_primario_diametro" integer,
	"medidas_primario_largo" integer,
	"medidas_secundario_diametro" integer,
	"medidas_secundario_largo" integer,
	"trombon_diametro_inicial" integer,
	"trombon_diametro_final" integer,
	"trombon_largo" integer,
	"trombon_observaciones" text,
	"tipo_vehiculo_id" integer,
	"marca_id" integer,
	"modelo_id" integer,
	"tipo_uso_id" integer,
	"categoria_competencia_id" integer,
	"margen_porcentaje" real DEFAULT 0 NOT NULL,
	"es_personalizable" boolean DEFAULT true,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "productos_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "productos_margen_porcentaje_range" CHECK ("productos"."margen_porcentaje" >= 0 AND "productos"."margen_porcentaje" < 100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proveedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"contacto_id" integer NOT NULL,
	"codigo" text,
	"contacto_nombre" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"condiciones_pago" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "proveedores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles_permisos" (
	"rol_id" integer,
	"permiso_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_permisos_rol_id_permiso_id_pk" PRIMARY KEY("rol_id","permiso_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tareas" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"archivada" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0,
	"prioridad" text DEFAULT 'media' NOT NULL,
	"fecha_entrega" timestamp,
	"asignado_a" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipos_insumo" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tipos_insumo_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_insumo_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipos_material" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"unidad" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tipos_material_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipos_uso" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tipos_uso_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipos_vehiculo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"activo" boolean DEFAULT true,
	CONSTRAINT "tipos_vehiculo_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transiciones_estado" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"estado_origen_id" integer NOT NULL,
	"estado_destino_id" integer NOT NULL,
	"requiere_rol" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transportistas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unidades_fabricacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_fabricacion_id" integer NOT NULL,
	"numero_serie" text NOT NULL,
	"estado_id" integer NOT NULL,
	"historial_estados" jsonb DEFAULT '[]'::jsonb,
	"comentario_estado" text,
	"es_defectuoso" boolean DEFAULT false,
	"defecto_descripcion" text,
	"foto_urls" text,
	"observaciones" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unidades_medida" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"dimension" text NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unidades_medida_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "unidades_medida_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol_id" integer,
	"empleado_id" integer,
	"activo" boolean DEFAULT true,
	"ultimo_acceso" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "usuarios_username_unique" UNIQUE("username"),
	CONSTRAINT "usuarios_empleado_id_unique" UNIQUE("empleado_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "adjuntos_cotizacion" ADD CONSTRAINT "adjuntos_cotizacion_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "categorias_competencia" ADD CONSTRAINT "categorias_competencia_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "categorias_insumos" ADD CONSTRAINT "categorias_insumos_padre_id_categorias_insumos_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."categorias_insumos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_contacto_distribuidor_id_contactos_id_fk" FOREIGN KEY ("contacto_distribuidor_id") REFERENCES "public"."contactos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_estado_id_estados_cotizacion_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_cotizacion"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_asignada_a_empleados_id_fk" FOREIGN KEY ("asignada_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creada_por_usuarios_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "envios" ADD CONSTRAINT "envios_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "envios" ADD CONSTRAINT "envios_transportista_id_transportistas_id_fk" FOREIGN KEY ("transportista_id") REFERENCES "public"."transportistas"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "insumos" ADD CONSTRAINT "insumos_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "insumos" ADD CONSTRAINT "insumos_tipo_id_tipos_insumo_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_insumo"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "insumos" ADD CONSTRAINT "insumos_categoria_id_categorias_insumos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_insumos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "insumos" ADD CONSTRAINT "insumos_unidad_id_unidades_medida_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades_medida"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_cotizacion" ADD CONSTRAINT "lineas_cotizacion_descuento_usuario_id_usuarios_id_fk" FOREIGN KEY ("descuento_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_descuento_usuario_id_usuarios_id_fk" FOREIGN KEY ("descuento_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "logs_cambios_estado" ADD CONSTRAINT "logs_cambios_estado_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "logs_sistema" ADD CONSTRAINT "logs_sistema_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "materiales_empleados" ADD CONSTRAINT "materiales_empleados_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "materiales_empleados" ADD CONSTRAINT "materiales_empleados_tipo_id_tipos_material_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_material"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "modelos" ADD CONSTRAINT "modelos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "modelos" ADD CONSTRAINT "modelos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notas_cotizacion" ADD CONSTRAINT "notas_cotizacion_cotizacion_id_cotizaciones_id_fk" FOREIGN KEY ("cotizacion_id") REFERENCES "public"."cotizaciones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notas_cotizacion" ADD CONSTRAINT "notas_cotizacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_linea_pedido_id_lineas_pedido_id_fk" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_asignado_a_empleados_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_descuento_usuario_id_usuarios_id_fk" FOREIGN KEY ("descuento_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedido_insumos" ADD CONSTRAINT "pedido_insumos_cotizacion_linea_id_lineas_cotizacion_id_fk" FOREIGN KEY ("cotizacion_linea_id") REFERENCES "public"."lineas_cotizacion"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_contacto_distribuidor_id_contactos_id_fk" FOREIGN KEY ("contacto_distribuidor_id") REFERENCES "public"."contactos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado_id_estados_pedido_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_pedido"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "producto_componentes" ADD CONSTRAINT "producto_componentes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "producto_componentes" ADD CONSTRAINT "producto_componentes_componente_id_productos_id_fk" FOREIGN KEY ("componente_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "producto_insumos" ADD CONSTRAINT "producto_insumos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "producto_insumos" ADD CONSTRAINT "producto_insumos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_uso_id_tipos_uso_id_fk" FOREIGN KEY ("tipo_uso_id") REFERENCES "public"."tipos_uso"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_competencia_id_categorias_competencia_id_fk" FOREIGN KEY ("categoria_competencia_id") REFERENCES "public"."categorias_competencia"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "tareas" ADD CONSTRAINT "tareas_asignado_a_empleados_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_estado_id_estados_fabricacion_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_fabricacion"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_adjuntos_cotizacion" ON "adjuntos_cotizacion" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lineas_cotizacion" ON "lineas_cotizacion" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lineas_pedido" ON "lineas_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_entidad" ON "logs_cambios_estado" USING btree ("entidad_tipo","entidad_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_usuario" ON "logs_cambios_estado" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notas_cotizacion" ON "notas_cotizacion" USING btree ("cotizacion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_linea" ON "ordenes_fabricacion" USING btree ("linea_pedido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_prioridad" ON "ordenes_fabricacion" USING btree ("prioridad");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pedido_insumos_pedido" ON "pedido_insumos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_producto_componentes_producto" ON "producto_componentes" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_producto_insumos_producto" ON "producto_insumos" USING btree ("producto_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_proveedor_contacto" ON "proveedores" USING btree ("contacto_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transicion_unica" ON "transiciones_estado" USING btree ("tipo","estado_origen_id","estado_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unidades_orden" ON "unidades_fabricacion" USING btree ("orden_fabricacion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unidades_estado" ON "unidades_fabricacion" USING btree ("estado_id");
--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "cliente_nombre";
--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "cliente_telefono";
--> statement-breakpoint
ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "cliente_email";
--> statement-breakpoint
INSERT INTO "tipos_insumo" ("codigo", "nombre") VALUES
	('material', 'Material'),
	('mano_obra', 'Mano de obra'),
	('indirecto', 'Costo indirecto'),
	('herramienta', 'Herramienta')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "unidades_medida" ("codigo", "nombre", "dimension") VALUES
	('unidad', 'Unidad', 'cantidad'),
	('metro', 'Metro', 'longitud'),
	('m2', 'Metro cuadrado', 'superficie'),
	('m3', 'Metro cúbico', 'volumen'),
	('kg', 'Kilogramo', 'masa'),
	('gramo', 'Gramo', 'masa'),
	('litro', 'Litro', 'volumen'),
	('hora', 'Hora', 'tiempo'),
	('dia', 'Día', 'tiempo')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "categorias_insumos" ("nombre", "descripcion")
SELECT nuevos.nombre, nuevos.descripcion
FROM (VALUES
	('Caños', 'Caños y tubos'),
	('Bridas', 'Bridas y uniones'),
	('Consumibles', 'Electrodos, discos y consumibles'),
	('Herramientas', 'Herramientas y alquileres')
) AS nuevos(nombre, descripcion)
WHERE NOT EXISTS (
	SELECT 1 FROM "categorias_insumos" existente WHERE existente.nombre = nuevos.nombre
);
--> statement-breakpoint
UPDATE "insumos" AS i
SET "tipo_id" = t."id"
FROM "tipos_insumo" AS t
WHERE t."codigo" = i."tipo" AND i."tipo_id" IS DISTINCT FROM t."id";
--> statement-breakpoint
UPDATE "insumos" AS i
SET "unidad_id" = u."id"
FROM "unidades_medida" AS u
WHERE u."codigo" = i."unidad" AND i."unidad_id" IS DISTINCT FROM u."id";
--> statement-breakpoint
UPDATE "productos" SET "margen_porcentaje" = 0 WHERE "margen_porcentaje" IS NULL;
--> statement-breakpoint
UPDATE "lineas_cotizacion"
SET "precio_lista_unitario" = "precio_unitario"
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" > 0;
--> statement-breakpoint
UPDATE "lineas_cotizacion" SET "costo_materiales" = 0 WHERE "costo_materiales" IS NULL;
--> statement-breakpoint
UPDATE "lineas_pedido"
SET "precio_lista_unitario" = "precio_unitario"
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" > 0;
--> statement-breakpoint
UPDATE "pedido_insumos"
SET "precio_lista_unitario" = COALESCE("costo_unitario", 0),
	"precio_unitario" = COALESCE("costo_unitario", 0)
WHERE "precio_lista_unitario" = 0 AND "precio_unitario" = 0;
--> statement-breakpoint
INSERT INTO "permisos" ("accion", "modulo")
SELECT nuevos.accion, nuevos.modulo
FROM (VALUES
	('view', 'cotizaciones'),
	('create', 'cotizaciones'),
	('edit', 'cotizaciones'),
	('delete', 'cotizaciones'),
	('asignar', 'cotizaciones'),
	('cotizar', 'cotizaciones'),
	('enviar', 'cotizaciones'),
	('aprobar', 'cotizaciones'),
	('convertir', 'cotizaciones'),
	('view', 'insumos'),
	('create', 'insumos'),
	('edit', 'insumos'),
	('delete', 'insumos'),
	('import', 'insumos'),
	('view', 'fabricacion'),
	('create', 'fabricacion'),
	('edit', 'fabricacion'),
	('delete', 'fabricacion'),
	('view', 'contactos'),
	('create', 'contactos'),
	('edit', 'contactos'),
	('delete', 'contactos'),
	('descuento', 'cotizaciones'),
	('descuento', 'pedidos')
) AS nuevos(accion, modulo)
WHERE NOT EXISTS (
	SELECT 1 FROM "permisos" existente
	WHERE existente.accion = nuevos.accion AND existente.modulo = nuevos.modulo
);
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rp.rol_id, nuevo.id
FROM "roles_permisos" rp
INNER JOIN "permisos" anterior
	ON anterior.id = rp.permiso_id AND anterior.modulo IN ('taller', 'clientes')
INNER JOIN "permisos" nuevo
	ON nuevo.modulo = CASE anterior.modulo WHEN 'taller' THEN 'fabricacion' ELSE 'contactos' END
	AND nuevo.accion = anterior.accion
WHERE NOT EXISTS (
	SELECT 1 FROM "roles_permisos" existente
	WHERE existente.rol_id = rp.rol_id AND existente.permiso_id = nuevo.id
);
--> statement-breakpoint
SELECT setval(
	pg_get_serial_sequence('permisos', 'id'),
	COALESCE(MAX(id), 1),
	MAX(id) IS NOT NULL
)
FROM "permisos";
--> statement-breakpoint
SELECT setval(
	pg_get_serial_sequence('feedback', 'id'),
	COALESCE(MAX(id), 1),
	MAX(id) IS NOT NULL
)
FROM "feedback";
--> statement-breakpoint
SELECT setval(
	pg_get_serial_sequence('categorias_productos', 'id'),
	COALESCE(MAX(id), 1),
	MAX(id) IS NOT NULL
)
FROM "categorias_productos";