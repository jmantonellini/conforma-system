import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// 1. SEGURIDAD Y AUTENTICACIÓN
// ============================================

export const roles = sqliteTable('roles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(),
	descripcion: text('descripcion'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const permisos = sqliteTable('permisos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	accion: text('accion').notNull(),
	modulo: text('modulo').notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const roles_permisos = sqliteTable(
	'roles_permisos',
	{
		rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'cascade' }),
		permiso_id: integer('permiso_id').references(() => permisos.id, { onDelete: 'cascade' }),
		created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
	},
	(table) => [primaryKey({ columns: [table.rol_id, table.permiso_id] })]
);

export const empleados = sqliteTable('empleados', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	apellido: text('apellido').notNull(),
	email: text('email').unique(),
	telefono: text('telefono'),
	dni: text('dni').unique(),
	direccion: text('direccion'),
	fecha_ingreso: integer('fecha_ingreso', { mode: 'timestamp' }),
	activo: integer('activo', { mode: 'boolean' }).default(true),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const usuarios = sqliteTable('usuarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'set null' }),
	empleado_id: integer('empleado_id')
		.references(() => empleados.id, { onDelete: 'set null' })
		.unique(),
	activo: integer('activo', { mode: 'boolean' }).default(true),
	ultimo_acceso: integer('ultimo_acceso', { mode: 'timestamp' }),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const sesiones = sqliteTable('sesiones', {
	id: text('id').primaryKey(),
	user_id: integer('user_id').references(() => usuarios.id, { onDelete: 'cascade' }),
	expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

// ============================================
// 2. CLIENTES Y PEDIDOS
// ============================================

export const clientes = sqliteTable('clientes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	razon_social: text('razon_social'),
	cuit: text('cuit').unique(),
	email: text('email'),
	telefono: text('telefono'),
	pais: text('pais').default('Argentina'),
	provincia: text('provincia'),
	ciudad: text('ciudad'),
	codigo_postal: text('codigo_postal'),
	calle: text('calle'),
	numero: text('numero'),
	piso: text('piso'),
	departamento: text('departamento'),
	activo: integer('activo', { mode: 'boolean' }).default(true),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export const categorias_productos = sqliteTable('categorias_productos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(), // escape, baranda, estructura, etc
	descripcion: text('descripcion'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const estados_pedido = sqliteTable('estados_pedido', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(),
	slug: text('slug').notNull().unique(), // en_espera_seña, señalado, falta_pago, en_proceso, listo_enviar, enviado, entregado, cancelado
	orden: integer('orden').notNull(),
	color: text('color'), // Hex o nombre de color
	requiere_notificacion: integer('requiere_notificacion', { mode: 'boolean' }).default(false),
	es_final: integer('es_final', { mode: 'boolean' }).default(false), // Para saber si es estado terminal
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const pedidos = sqliteTable('pedidos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	numero_pedido: text('numero_pedido').notNull().unique(),
	cliente_id: integer('cliente_id')
		.references(() => clientes.id, { onDelete: 'restrict' })
		.notNull(),
	fecha_pedido: integer('fecha_pedido', { mode: 'timestamp' }).notNull(),
	fecha_entrega_prometida: integer('fecha_entrega_prometida', { mode: 'timestamp' }),
	fecha_entrega_real: integer('fecha_entrega_real', { mode: 'timestamp' }),
	estado_id: integer('estado_id')
		.references(() => estados_pedido.id, { onDelete: 'restrict' })
		.notNull(),
	precio_total: real('precio_total'),
	anticipo: real('anticipo'),
	saldo_pendiente: real('saldo_pendiente'),
	observaciones: text('observaciones'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

// ============================================
// 3. PRODUCTOS Y LÍNEAS DE PEDIDO
// ============================================

export const productos = sqliteTable('productos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	codigo: text('codigo').unique().notNull(),
	nombre: text('nombre').notNull(),
	categoria_id: integer('categoria_id').references(() => categorias_productos.id, {
		onDelete: 'set null'
	}),

	// Especificaciones técnicas estándar
	medidas_primario_diametro: integer('medidas_primario_diametro'),
	medidas_primario_largo: integer('medidas_primario_largo'),
	medidas_secundario_diametro: integer('medidas_secundario_diametro'),
	medidas_secundario_largo: integer('medidas_secundario_largo'),
	trombon_diametro_inicial: integer('trombon_diametro_inicial'),
	trombon_largo: integer('trombon_largo'),
	trombon_observaciones: text('trombon_observaciones'),

	tipo_vehiculo_id: integer('tipo_vehiculo_id').references(() => tipos_vehiculo.id),
	marca_id: integer('marca_id').references(() => marcas.id),
	modelo_id: integer('modelo_id').references(() => modelos.id),

	tipo_uso_id: integer('tipo_uso_id').references(() => tipos_uso.id),
	categoria_competencia_id: integer('categoria_competencia_id').references(
		() => categorias_competencia.id
	),

	precio_base: real('precio_base'),
	es_personalizable: integer('es_personalizable', { mode: 'boolean' }).default(true),
	activo: integer('activo', { mode: 'boolean' }).default(true),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export const lineas_pedido = sqliteTable('lineas_pedido', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	pedido_id: integer('pedido_id')
		.references(() => pedidos.id, { onDelete: 'cascade' })
		.notNull(),
	producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
	orden_fabricacion_id: integer('orden_fabricacion_id').references(() => ordenes_fabricacion.id, {
		onDelete: 'set null'
	}),

	// Datos personalizados (sobreescriben al producto)
	es_personalizado: integer('es_personalizado', { mode: 'boolean' }).default(false),
	descripcion_personalizada: text('descripcion_personalizada'),

	// Medidas específicas (copia o sobreescribe al producto)
	medidas_primario_diametro: integer('medidas_primario_diametro'),
	medidas_primario_largo: integer('medidas_primario_largo'),
	medidas_secundario_diametro: integer('medidas_secundario_diametro'),
	medidas_secundario_largo: integer('medidas_secundario_largo'),
	trombon_diametro_inicial: integer('trombon_diametro_inicial'),
	trombon_largo: integer('trombon_largo'),
	trombon_observaciones: text('trombon_observaciones'),

	cantidad: integer('cantidad').notNull().default(1),
	precio_unitario: real('precio_unitario').notNull(),
	subtotal: real('subtotal').generatedAlwaysAs(sql`cantidad * precio_unitario`),

	orden_linea: integer('orden_linea'), // Para ordenar líneas dentro del pedido
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export const tipos_vehiculo = sqliteTable('tipos_vehiculo', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(), // Auto, Moto, Camioneta, Avión
	slug: text('slug').notNull().unique(), // auto, moto, camioneta, avion
	activo: integer('activo', { mode: 'boolean' }).default(true)
});

export const marcas = sqliteTable('marcas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(),
	activo: integer('activo', { mode: 'boolean' }).default(true)
});

export const modelos = sqliteTable('modelos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	marca_id: integer('marca_id')
		.references(() => marcas.id, { onDelete: 'restrict' })
		.notNull(),
	tipo_vehiculo_id: integer('tipo_vehiculo_id')
		.references(() => tipos_vehiculo.id, { onDelete: 'restrict' })
		.notNull(),
	nombre: text('nombre').notNull(),
	anio_desde: integer('anio_desde'),
	anio_hasta: integer('anio_hasta'),
	activo: integer('activo', { mode: 'boolean' }).default(true)
});

export const tipos_uso = sqliteTable('tipos_uso', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(), // Calle, Competición
	slug: text('slug').notNull().unique()
});

export const categorias_competencia = sqliteTable('categorias_competencia', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion'),
	tipo_vehiculo_id: integer('tipo_vehiculo_id')
		.references(() => tipos_vehiculo.id)
		.notNull(),
	activa_desde: integer('activa_desde', { mode: 'timestamp' }),
	activa_hasta: integer('activa_hasta', { mode: 'timestamp' }),
	vigente: integer('vigente', { mode: 'boolean' }).default(true)
});

// ============================================
// 4. FABRICACIÓN Y PRODUCCIÓN
// ============================================

export const estados_fabricacion = sqliteTable('estados_fabricacion', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(),
	slug: text('slug').notNull().unique(), // pendiente, en_corte, en_curvado, ensamblando, soldando, alistando, listo, entregado
	orden: integer('orden').notNull(),
	color: text('color'),
	es_final: integer('es_final', { mode: 'boolean' }).default(false),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const ordenes_fabricacion = sqliteTable('ordenes_fabricacion', {
	id: integer('id').primaryKey({ autoIncrement: true }),

	nombre_trabajo: text('nombre_trabajo').notNull(),
	cantidad_total: integer('cantidad_total').notNull().default(1),
	cantidad_producida: integer('cantidad_producida').default(0),
	cantidad_defectuosa: integer('cantidad_defectuosa').default(0),

	estado_id: integer('estado_id')
		.references(() => estados_fabricacion.id, { onDelete: 'restrict' })
		.notNull(),

	prioridad: integer('prioridad').default(0), // 0=normal, 1=urgente, 2=crítica
	fecha_inicio: integer('fecha_inicio', { mode: 'timestamp' }),
	fecha_fin_estimada: integer('fecha_fin_estimada', { mode: 'timestamp' }),
	fecha_fin_real: integer('fecha_fin_real', { mode: 'timestamp' }),

	asignado_a: integer('asignado_a').references(() => empleados.id, { onDelete: 'set null' }),
	observaciones: text('observaciones'),

	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export const unidades_fabricacion = sqliteTable('unidades_fabricacion', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	orden_fabricacion_id: integer('orden_fabricacion_id')
		.references(() => ordenes_fabricacion.id, { onDelete: 'cascade' })
		.notNull(),

	numero_serie: text('numero_serie').notNull(),
	estado_id: integer('estado_id')
		.references(() => estados_fabricacion.id, { onDelete: 'restrict' })
		.notNull(),

	fecha_entrada_estado: integer('fecha_entrada_estado', { mode: 'timestamp' }).$default(
		() => new Date()
	),

	es_defectuoso: integer('es_defectuoso', { mode: 'boolean' }).default(false),
	defecto_descripcion: text('defecto_descripcion'),

	foto_urls: text('foto_urls'), // JSON array
	observaciones: text('observaciones'),

	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date()),
	updated_at: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

// ============================================
// 5. MATERIALES Y COSTOS
// ============================================

export const tipos_material = sqliteTable('tipos_material', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull().unique(), // bridas, caños_curvas, otros, personal, horas
	unidad_por_defecto: text('unidad'), // unidad, hora, kg, metro
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const materiales_empleados = sqliteTable('materiales_empleados', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	orden_fabricacion_id: integer('orden_fabricacion_id')
		.references(() => ordenes_fabricacion.id, { onDelete: 'cascade' })
		.notNull(),
	tipo_id: integer('tipo_id')
		.references(() => tipos_material.id, { onDelete: 'restrict' })
		.notNull(),
	nombre: text('nombre').notNull(),
	cantidad: real('cantidad').notNull(),
	unidad: text('unidad').notNull(),
	costo_unitario: real('costo_unitario'),
	costo_total: real('costo_total').generatedAlwaysAs(sql`cantidad * costo_unitario`),
	observaciones: text('observaciones'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

// ============================================
// 6. AUDITORÍA Y LOGS
// ============================================

export const logs_pedidos = sqliteTable('logs_pedidos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	pedido_id: integer('pedido_id')
		.references(() => pedidos.id, { onDelete: 'cascade' })
		.notNull(),
	usuario_id: integer('usuario_id')
		.references(() => usuarios.id, { onDelete: 'set null' })
		.notNull(),
	campo: text('campo'),
	valor_anterior: text('valor_anterior'),
	valor_nuevo: text('valor_nuevo'),
	accion: text('accion').notNull(),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const logs_estados_pedido = sqliteTable('logs_estados_pedido', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	pedido_id: integer('pedido_id')
		.references(() => pedidos.id, { onDelete: 'cascade' })
		.notNull(),
	usuario_id: integer('usuario_id')
		.references(() => usuarios.id, { onDelete: 'set null' })
		.notNull(),
	estado_anterior_id: integer('estado_anterior_id').references(() => estados_pedido.id),
	estado_nuevo_id: integer('estado_nuevo_id')
		.references(() => estados_pedido.id)
		.notNull(),
	tiempo_empleado: integer('tiempo_empleado'), // minutos
	comentario: text('comentario'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const logs_unidades_fabricacion = sqliteTable('logs_unidades_fabricacion', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	unidad_id: integer('unidad_id')
		.references(() => unidades_fabricacion.id, { onDelete: 'cascade' })
		.notNull(),
	usuario_id: integer('usuario_id')
		.references(() => usuarios.id, { onDelete: 'set null' })
		.notNull(),
	estado_anterior_id: integer('estado_anterior_id').references(() => estados_fabricacion.id),
	estado_nuevo_id: integer('estado_nuevo_id')
		.references(() => estados_fabricacion.id)
		.notNull(),
	tiempo_transcurrido: integer('tiempo_transcurrido'), // minutos
	comentario: text('comentario'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

export const logs_sistema = sqliteTable('logs_sistema', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
	accion: text('accion').notNull(),
	detalles: text('detalles'),
	ip_address: text('ip_address'),
	created_at: integer('created_at', { mode: 'timestamp' }).$default(() => new Date())
});

// ============================================
// 7. TIPOS DE TYPESCRIPT
// ============================================

export type Usuario = typeof usuarios.$inferSelect;
export type Rol = typeof roles.$inferSelect;
export type Permiso = typeof permisos.$inferSelect;
export type Empleado = typeof empleados.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type OrdenFabricacion = typeof ordenes_fabricacion.$inferSelect;
export type UnidadFabricacion = typeof unidades_fabricacion.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type LineaPedido = typeof lineas_pedido.$inferSelect;
export type EstadoPedido = typeof estados_pedido.$inferSelect;
export type EstadoFabricacion = typeof estados_fabricacion.$inferSelect;
export type Modelo = typeof modelos.$inferSelect;
export type Marca = typeof marcas.$inferSelect;
export type TipoUso = typeof tipos_uso.$inferSelect;
export type TipoVehiculo = typeof tipos_vehiculo.$inferSelect;
export type CategoriaComp = typeof categorias_competencia.$inferSelect;
