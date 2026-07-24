CREATE TABLE "categorias_competencia" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"tipo_vehiculo_id" integer NOT NULL,
	"activa_desde" integer,
	"activa_hasta" integer,
	"vigente" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "categorias_productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categorias_productos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text,
	"razon_social" text,
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
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "clientes_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "empleados" (
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
CREATE TABLE "estados_fabricacion" (
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
CREATE TABLE "estados_pedido" (
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
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"mensaje" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lineas_pedido" (
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
	"orden_linea" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "logs_cambios_estado" (
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
CREATE TABLE "logs_sistema" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"accion" text NOT NULL,
	"detalles" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marcas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"logo_url" text,
	"activo" boolean DEFAULT true,
	CONSTRAINT "marcas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "materiales_empleados" (
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
CREATE TABLE "modelos" (
	"id" serial PRIMARY KEY NOT NULL,
	"marca_id" integer NOT NULL,
	"tipo_vehiculo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"anio_desde" integer,
	"anio_hasta" integer,
	"activo" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "ordenes_fabricacion" (
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
CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_pedido" text NOT NULL,
	"cliente_id" integer NOT NULL,
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
CREATE TABLE "permisos" (
	"id" serial PRIMARY KEY NOT NULL,
	"accion" text NOT NULL,
	"modulo" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"categoria_id" integer,
	"medidas_primario_diametro" integer,
	"medidas_primario_largo" integer,
	"medidas_secundario_diametro" integer,
	"medidas_secundario_largo" integer,
	"trombon_diametro_inicial" integer,
	"trombon_largo" integer,
	"trombon_observaciones" text,
	"tipo_vehiculo_id" integer,
	"marca_id" integer,
	"modelo_id" integer,
	"tipo_uso_id" integer,
	"categoria_competencia_id" integer,
	"precio_base" real,
	"es_personalizable" boolean DEFAULT true,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "productos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "roles_permisos" (
	"rol_id" integer,
	"permiso_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_permisos_rol_id_permiso_id_pk" PRIMARY KEY("rol_id","permiso_id")
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tareas" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"orden" integer DEFAULT 0,
	"prioridad" text DEFAULT 'media' NOT NULL,
	"fecha_entrega" timestamp,
	"asignado_a" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tipos_material" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"unidad" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tipos_material_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tipos_uso" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tipos_uso_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tipos_vehiculo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"activo" boolean DEFAULT true,
	CONSTRAINT "tipos_vehiculo_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transiciones_estado" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"estado_origen_id" integer NOT NULL,
	"estado_destino_id" integer NOT NULL,
	"requiere_rol" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unidades_fabricacion" (
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
CREATE TABLE "usuarios" (
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
ALTER TABLE "categorias_competencia" ADD CONSTRAINT "categorias_competencia_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineas_pedido" ADD CONSTRAINT "lineas_pedido_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_cambios_estado" ADD CONSTRAINT "logs_cambios_estado_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_sistema" ADD CONSTRAINT "logs_sistema_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ADD CONSTRAINT "materiales_empleados_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiales_empleados" ADD CONSTRAINT "materiales_empleados_tipo_id_tipos_material_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_material"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_linea_pedido_id_lineas_pedido_id_fk" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_fabricacion" ADD CONSTRAINT "ordenes_fabricacion_asignado_a_empleados_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_estado_id_estados_pedido_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_pedido"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_uso_id_tipos_uso_id_fk" FOREIGN KEY ("tipo_uso_id") REFERENCES "public"."tipos_uso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_competencia_id_categorias_competencia_id_fk" FOREIGN KEY ("categoria_competencia_id") REFERENCES "public"."categorias_competencia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_asignado_a_empleados_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_orden_fabricacion_id_ordenes_fabricacion_id_fk" FOREIGN KEY ("orden_fabricacion_id") REFERENCES "public"."ordenes_fabricacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_fabricacion" ADD CONSTRAINT "unidades_fabricacion_estado_id_estados_fabricacion_id_fk" FOREIGN KEY ("estado_id") REFERENCES "public"."estados_fabricacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lineas_pedido" ON "lineas_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_logs_entidad" ON "logs_cambios_estado" USING btree ("entidad_tipo","entidad_id");--> statement-breakpoint
CREATE INDEX "idx_logs_usuario" ON "logs_cambios_estado" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_ordenes_linea" ON "ordenes_fabricacion" USING btree ("linea_pedido_id");--> statement-breakpoint
CREATE INDEX "idx_ordenes_prioridad" ON "ordenes_fabricacion" USING btree ("prioridad");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transicion_unica" ON "transiciones_estado" USING btree ("tipo","estado_origen_id","estado_destino_id");--> statement-breakpoint
CREATE INDEX "idx_unidades_orden" ON "unidades_fabricacion" USING btree ("orden_fabricacion_id");--> statement-breakpoint
CREATE INDEX "idx_unidades_estado" ON "unidades_fabricacion" USING btree ("estado_id");