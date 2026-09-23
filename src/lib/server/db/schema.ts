import {
	pgTable,
	text,
	integer,
	real,
	primaryKey,
	index,
	timestamp,
	serial,
	boolean,
	jsonb,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { EstadosTarea, Prioridades } from '$lib/types';

export const estados_fabricacion = pgTable('estados_fabricacion', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	slug: text('slug').notNull().unique(),
	grupo: text('grupo').notNull(),
	orden: integer('orden').notNull(),
	color: text('color'),
	es_final: boolean('es_final').default(false),
	created_at: timestamp('created_at').defaultNow()
});

export const estados_pedido = pgTable('estados_pedido', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	slug: text('slug').notNull().unique(),
	grupo: text('grupo').notNull(),
	orden: integer('orden').notNull(),
	color: text('color'),
	es_final: boolean('es_final').default(false),
	created_at: timestamp('created_at').defaultNow()
});

export const estados_cotizacion = pgTable('estados_cotizacion', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	slug: text('slug').notNull().unique(),
	grupo: text('grupo').notNull(),
	orden: integer('orden').notNull(),
	color: text('color'),
	es_final: boolean('es_final').default(false),
	created_at: timestamp('created_at').defaultNow()
});

export const transiciones_estado = pgTable(
	'transiciones_estado',
	{
		id: serial('id').primaryKey(),
		tipo: text('tipo').notNull(), // "fabricacion" | "pedido"
		estado_origen_id: integer('estado_origen_id').notNull(),
		estado_destino_id: integer('estado_destino_id').notNull(),
		requiere_rol: text('requiere_rol'),
		created_at: timestamp('created_at').defaultNow()
	},
	(table) => [
		uniqueIndex('idx_transicion_unica').on(
			table.tipo,
			table.estado_origen_id,
			table.estado_destino_id
		)
	]
);

export const roles = pgTable('roles', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	descripcion: text('descripcion'),
	created_at: timestamp('created_at').defaultNow()
});

export const permisos = pgTable('permisos', {
	id: serial('id').primaryKey(),
	accion: text('accion').notNull(),
	modulo: text('modulo').notNull(),
	created_at: timestamp('created_at').defaultNow()
});

export const roles_permisos = pgTable(
	'roles_permisos',
	{
		rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'cascade' }),
		permiso_id: integer('permiso_id').references(() => permisos.id, { onDelete: 'cascade' }),
		created_at: timestamp('created_at').defaultNow()
	},
	(table) => [primaryKey({ columns: [table.rol_id, table.permiso_id] })]
);

export const empleados = pgTable('empleados', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	apellido: text('apellido').notNull(),
	email: text('email').unique(),
	telefono: text('telefono'),
	dni: text('dni').unique(),
	direccion: text('direccion'),
	fecha_ingreso: timestamp('fecha_ingreso'),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow()
});

export const usuarios = pgTable('usuarios', {
	id: serial('id').primaryKey(),
	username: text('username').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	rol_id: integer('rol_id').references(() => roles.id, { onDelete: 'set null' }),
	empleado_id: integer('empleado_id')
		.references(() => empleados.id, { onDelete: 'set null' })
		.unique(),
	activo: boolean('activo').default(true),
	ultimo_acceso: integer('ultimo_acceso'),
	created_at: timestamp('created_at').defaultNow()
});

export const sesiones = pgTable('sesiones', {
	id: text('id').primaryKey(),
	user_id: integer('user_id').references(() => usuarios.id, { onDelete: 'cascade' }),
	expires_at: timestamp('expires_at').notNull(),
	ip_address: text('ip_address'),
	user_agent: text('user_agent'),
	created_at: timestamp('created_at').defaultNow()
});

export const feedback = pgTable('feedback', {
	id: serial('id').primaryKey(),
	mensaje: text('mensaje').notNull(),
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// COTIZACIONES
// ============================================================

export const cotizaciones = pgTable('cotizaciones', {
	id: serial('id').primaryKey(),
	numero_cotizacion: text('numero_cotizacion').notNull().unique(),
	contacto_id: integer('contacto_id').references(() => contactos.id, { onDelete: 'set null' }),
	contacto_distribuidor_id: integer('contacto_distribuidor_id').references(() => contactos.id, {
		onDelete: 'set null'
	}),
	// Contacto espontáneo (todavía no es cliente cargado)
	cliente_nombre: text('cliente_nombre').notNull(),
	cliente_telefono: text('cliente_telefono'),
	cliente_email: text('cliente_email'),
	canal: text('canal').notNull().default('whatsapp'), // whatsapp | llamada | email | presencial | otro
	descripcion: text('descripcion').notNull(),
	estado_id: integer('estado_id')
		.references(() => estados_cotizacion.id, { onDelete: 'restrict' })
		.notNull(),
	asignada_a: integer('asignada_a').references(() => empleados.id, { onDelete: 'set null' }),
	creada_por: integer('creada_por').references(() => usuarios.id, { onDelete: 'set null' }),
	precio_total: real('precio_total'),
	validez_dias: integer('validez_dias').default(15),
	fecha_envio: timestamp('fecha_envio'),
	pedido_id: integer('pedido_id').references(() => pedidos.id, { onDelete: 'set null' }),
	observaciones: text('observaciones'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const lineas_cotizacion = pgTable(
	'lineas_cotizacion',
	{
		id: serial('id').primaryKey(),
		cotizacion_id: integer('cotizacion_id')
			.references(() => cotizaciones.id, { onDelete: 'cascade' })
			.notNull(),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
		insumo_id: integer('insumo_id').references(() => insumos.id, { onDelete: 'set null' }),
		es_personalizado: boolean('es_personalizado').default(false),
		descripcion: text('descripcion').notNull(),
		cantidad: integer('cantidad').notNull().default(1),
		precio_unitario: real('precio_unitario').notNull(),
		subtotal: real('subtotal').generatedAlwaysAs(sql`cantidad * precio_unitario`),
		// Base para las futuras fórmulas de costos
		costo_mano_obra: real('costo_mano_obra'),
		costo_materiales: real('costo_materiales'),
		insumos_snapshot: jsonb('insumos_snapshot'),
		orden_linea: integer('orden_linea'),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [index('idx_lineas_cotizacion').on(table.cotizacion_id)]
);

export const adjuntos_cotizacion = pgTable(
	'adjuntos_cotizacion',
	{
		id: serial('id').primaryKey(),
		cotizacion_id: integer('cotizacion_id')
			.references(() => cotizaciones.id, { onDelete: 'cascade' })
			.notNull(),
		nombre_original: text('nombre_original').notNull(),
		archivo_url: text('archivo_url').notNull(),
		mime_type: text('mime_type'),
		tamano_bytes: integer('tamano_bytes'),
		created_at: timestamp('created_at').defaultNow()
	},
	(table) => [index('idx_adjuntos_cotizacion').on(table.cotizacion_id)]
);

// ============================================================
// CLIENTES Y PEDIDOS
// ============================================================

export const contactos = pgTable('contactos', {
	id: serial('id').primaryKey(),
	razon_social: text('razon_social').notNull(),
	nombre: text('nombre'),
	apellido: text('apellido'),
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
	es_cliente: boolean('es_cliente').default(false),
	es_distribuidor: boolean('es_distribuidor').default(false),
	porcentaje_compensacion: real('porcentaje_compensacion').default(0),
	saldo_disponible: real('saldo_disponible').default(0),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const configuracion_empresa = pgTable('configuracion_empresa', {
	id: integer('id').primaryKey().default(1),
	razon_social: text('razon_social').notNull().default('Conforma'),
	cuit: text('cuit'),
	direccion: text('direccion'),
	telefono: text('telefono'),
	email: text('email'),
	logo_url: text('logo_url'),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const proveedores = pgTable(
	'proveedores',
	{
		id: serial('id').primaryKey(),
		contacto_id: integer('contacto_id')
			.references(() => contactos.id, { onDelete: 'restrict' })
			.notNull(),
		codigo: text('codigo').unique(),
		contacto_nombre: text('contacto_nombre'),
		contacto_email: text('contacto_email'),
		contacto_telefono: text('contacto_telefono'),
		condiciones_pago: text('condiciones_pago'),
		activo: boolean('activo').default(true),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [uniqueIndex('idx_proveedor_contacto').on(table.contacto_id)]
);

export const categorias_productos = pgTable('categorias_productos', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	descripcion: text('descripcion'),
	created_at: timestamp('created_at').defaultNow()
});

export const tipos_insumo = pgTable('tipos_insumo', {
	id: serial('id').primaryKey(),
	codigo: text('codigo').notNull().unique(),
	nombre: text('nombre').notNull().unique(),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow()
});

export const unidades_medida = pgTable('unidades_medida', {
	id: serial('id').primaryKey(),
	codigo: text('codigo').notNull().unique(),
	nombre: text('nombre').notNull().unique(),
	dimension: text('dimension').notNull(),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow()
});

export const categorias_insumos = pgTable('categorias_insumos', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion'),
	padre_id: integer('padre_id').references((): AnyPgColumn => categorias_insumos.id, {
		onDelete: 'set null'
	}),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow()
});

export const insumos = pgTable('insumos', {
	id: serial('id').primaryKey(),
	codigo: text('codigo').notNull().unique(),
	nombre: text('nombre').notNull(),
	proveedor_id: integer('proveedor_id').references(() => proveedores.id, { onDelete: 'set null' }),
	tipo_id: integer('tipo_id').references(() => tipos_insumo.id, { onDelete: 'restrict' }),
	categoria_id: integer('categoria_id').references(() => categorias_insumos.id, {
		onDelete: 'set null'
	}),
	unidad_id: integer('unidad_id').references(() => unidades_medida.id, { onDelete: 'restrict' }),
	tipo: text('tipo').notNull().default('material'),
	unidad: text('unidad').notNull().default('unidad'),
	costo_unitario: real('costo_unitario').notNull().default(0),
	flete_porcentaje: real('flete_porcentaje').notNull().default(0),
	activo: boolean('activo').default(true),
	observaciones: text('observaciones'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const pedidos = pgTable('pedidos', {
	id: serial('id').primaryKey(),
	numero_pedido: text('numero_pedido').notNull().unique(),
	contacto_id: integer('contacto_id')
		.references(() => contactos.id, { onDelete: 'restrict' })
		.notNull(),
	contacto_distribuidor_id: integer('contacto_distribuidor_id').references(() => contactos.id, {
		onDelete: 'set null'
	}),
	usar_credito_distribuidor: boolean('usar_credito_distribuidor').default(false),
	monto_credito_distribuidor: real('monto_credito_distribuidor').default(0),
	porcentaje_comision_distribuidor: real('porcentaje_comision_distribuidor').default(0),
	monto_comision_distribuidor: real('monto_comision_distribuidor').default(0),
	comision_distribuidor_descontada: boolean('comision_distribuidor_descontada').default(false),
	fecha_pedido: timestamp('fecha_pedido').notNull(),
	fecha_entrega_prometida: timestamp('fecha_entrega_prometida'),
	fecha_entrega_real: timestamp('fecha_entrega_real'),
	estado_id: integer('estado_id')
		.references(() => estados_pedido.id, { onDelete: 'restrict' })
		.notNull(),
	precio_total: real('precio_total'),
	anticipo: real('anticipo'),
	saldo_pendiente: real('saldo_pendiente'),
	observaciones: text('observaciones'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const lineas_pedido = pgTable(
	'lineas_pedido',
	{
		id: serial('id').primaryKey(),
		pedido_id: integer('pedido_id')
			.references(() => pedidos.id, { onDelete: 'cascade' })
			.notNull(),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
		es_personalizado: boolean('es_personalizado').default(false),
		descripcion_personalizada: text('descripcion_personalizada'),
		fecha_envio_parcial: timestamp('fecha_envio_parcial'),
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
		insumos_snapshot: jsonb('insumos_snapshot'),
		orden_linea: integer('orden_linea'),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [index('idx_lineas_pedido').on(table.pedido_id)]
);

export const pedido_insumos = pgTable(
	'pedido_insumos',
	{
		id: serial('id').primaryKey(),
		pedido_id: integer('pedido_id')
			.references(() => pedidos.id, { onDelete: 'cascade' })
			.notNull(),
		insumo_id: integer('insumo_id')
			.references(() => insumos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: real('cantidad').notNull().default(1),
		unidad: text('unidad').notNull(),
		costo_unitario: real('costo_unitario'),
		cotizacion_linea_id: integer('cotizacion_linea_id').references(() => lineas_cotizacion.id, {
			onDelete: 'set null'
		}),
		observaciones: text('observaciones'),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [index('idx_pedido_insumos_pedido').on(table.pedido_id)]
);

// ============================================================
// FACTURACION
// ============================================================

export const pagos = pgTable('pagos', {
	id: serial('id').primaryKey(),
	pedido_id: integer('pedido_id')
		.references(() => pedidos.id, { onDelete: 'cascade' })
		.notNull(),
	monto: real('monto').notNull(),
	fecha_pago: timestamp('fecha_pago').defaultNow(),
	metodo_pago: text('metodo_pago'), // 'efectivo', 'transferencia', 'cheque'
	observaciones: text('observaciones'),
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// PRODUCTOS
// ============================================================

export const tipos_vehiculo = pgTable('tipos_vehiculo', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	slug: text('slug').notNull().unique(),
	activo: boolean('activo').default(true)
});

export const marcas = pgTable('marcas', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	logo_url: text('logo_url'),
	activo: boolean('activo').default(true)
});

export const modelos = pgTable('modelos', {
	id: serial('id').primaryKey(),
	marca_id: integer('marca_id')
		.references(() => marcas.id, { onDelete: 'restrict' })
		.notNull(),
	tipo_vehiculo_id: integer('tipo_vehiculo_id')
		.references(() => tipos_vehiculo.id, { onDelete: 'restrict' })
		.notNull(),
	nombre: text('nombre').notNull(),
	anio_desde: integer('anio_desde'),
	anio_hasta: integer('anio_hasta'),
	activo: boolean('activo').default(true)
});

export const tipos_uso = pgTable('tipos_uso', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	slug: text('slug').notNull().unique()
});

export const categorias_competencia = pgTable('categorias_competencia', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion'),
	tipo_vehiculo_id: integer('tipo_vehiculo_id')
		.references(() => tipos_vehiculo.id)
		.notNull(),
	activa_desde: integer('activa_desde'),
	activa_hasta: integer('activa_hasta'),
	vigente: boolean('vigente').default(true)
});

export const productos = pgTable('productos', {
	id: serial('id').primaryKey(),
	codigo: text('codigo').unique().notNull(),
	nombre: text('nombre').notNull(),
	categoria_id: integer('categoria_id').references(() => categorias_productos.id, {
		onDelete: 'set null'
	}),
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
	es_personalizable: boolean('es_personalizable').default(true),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

export const producto_insumos = pgTable(
	'producto_insumos',
	{
		id: serial('id').primaryKey(),
		producto_id: integer('producto_id')
			.references(() => productos.id, { onDelete: 'cascade' })
			.notNull(),
		insumo_id: integer('insumo_id')
			.references(() => insumos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: real('cantidad').notNull().default(1),
		orden: integer('orden').notNull().default(0),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [index('idx_producto_insumos_producto').on(table.producto_id)]
);

export const producto_componentes = pgTable(
	'producto_componentes',
	{
		id: serial('id').primaryKey(),
		producto_id: integer('producto_id')
			.references(() => productos.id, { onDelete: 'cascade' })
			.notNull(),
		componente_id: integer('componente_id')
			.references(() => productos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: integer('cantidad').notNull().default(1),
		orden: integer('orden').notNull().default(0),
		created_at: timestamp('created_at').defaultNow()
	},
	(table) => [index('idx_producto_componentes_producto').on(table.producto_id)]
);

// ============================================================
// FABRICACIÓN
// ============================================================

export const ordenes_fabricacion = pgTable(
	'ordenes_fabricacion',
	{
		id: serial('id').primaryKey(),
		linea_pedido_id: integer('linea_pedido_id')
			.references(() => lineas_pedido.id, { onDelete: 'restrict' })
			.notNull()
			.unique(),
		nombre_trabajo: text('nombre_trabajo').notNull(),
		cantidad_total: integer('cantidad_total').notNull().default(1),
		prioridad: integer('prioridad').default(0),
		fecha_inicio: timestamp('fecha_inicio'),
		fecha_fin_estimada: timestamp('fecha_fin_estimada'),
		fecha_fin_real: timestamp('fecha_fin_real'),
		asignado_a: integer('asignado_a').references(() => empleados.id, { onDelete: 'set null' }),
		observaciones: text('observaciones'),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [
		index('idx_ordenes_linea').on(table.linea_pedido_id),
		index('idx_ordenes_prioridad').on(table.prioridad)
	]
);

// UNIDAD
export const unidades_fabricacion = pgTable(
	'unidades_fabricacion',
	{
		id: serial('id').primaryKey(),
		orden_fabricacion_id: integer('orden_fabricacion_id')
			.references(() => ordenes_fabricacion.id, { onDelete: 'cascade' })
			.notNull(),
		numero_serie: text('numero_serie').notNull(),
		estado_id: integer('estado_id')
			.references(() => estados_fabricacion.id, { onDelete: 'restrict' })
			.notNull(),
		historial_estados: jsonb('historial_estados')
			.$type<Array<{ estado_id: number; fecha: string; comentario?: string }>>()
			.default(sql`'[]'::jsonb`),
		comentario_estado: text('comentario_estado'),
		es_defectuoso: boolean('es_defectuoso').default(false),
		defecto_descripcion: text('defecto_descripcion'),
		foto_urls: text('foto_urls'), // JSON array
		observaciones: text('observaciones'),
		created_at: timestamp('created_at').defaultNow(),
		updated_at: timestamp('updated_at').$onUpdate(() => new Date())
	},
	(table) => [
		index('idx_unidades_orden').on(table.orden_fabricacion_id),
		index('idx_unidades_estado').on(table.estado_id)
	]
);

// ============================================================
// MATERIALES Y COSTOS
// ============================================================

export const tipos_material = pgTable('tipos_material', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull().unique(),
	unidad_por_defecto: text('unidad'),
	created_at: timestamp('created_at').defaultNow()
});

export const materiales_empleados = pgTable('materiales_empleados', {
	id: serial('id').primaryKey(),
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
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// AUDITORÍA — Logs polimórficos
// ============================================================

export const logs_cambios_estado = pgTable(
	'logs_cambios_estado',
	{
		id: serial('id').primaryKey(),
		entidad_tipo: text('entidad_tipo').notNull(), // "unidad" | "pedido"
		entidad_id: integer('entidad_id').notNull(),
		usuario_id: integer('usuario_id')
			.references(() => usuarios.id, { onDelete: 'set null' })
			.notNull(),
		estado_anterior_id: integer('estado_anterior_id'),
		estado_nuevo_id: integer('estado_nuevo_id').notNull(),
		comentario: text('comentario'),
		created_at: timestamp('created_at').defaultNow()
	},
	(table) => [
		index('idx_logs_entidad').on(table.entidad_tipo, table.entidad_id),
		index('idx_logs_usuario').on(table.usuario_id)
	]
);

export const logs_sistema = pgTable('logs_sistema', {
	id: serial('id').primaryKey(),
	usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
	accion: text('accion').notNull(),
	detalles: text('detalles'),
	ip_address: text('ip_address'),
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// TAREAS
// ============================================================

export const tareas = pgTable('tareas', {
	id: serial('id').primaryKey(),
	titulo: text('titulo').notNull(),
	descripcion: text('descripcion'),
	estado: text('estado', {
		enum: [EstadosTarea.PENDIENTE, EstadosTarea.EN_PROGRESO, EstadosTarea.COMPLETADA]
	})
		.notNull()
		.default(EstadosTarea.PENDIENTE),
	orden: integer('orden').default(0),
	prioridad: text('prioridad', { enum: [Prioridades.BAJA, Prioridades.MEDIA, Prioridades.ALTA] })
		.notNull()
		.default(Prioridades.MEDIA),
	fecha_entrega: timestamp('fecha_entrega'),
	asignado_a: integer('asignado_a').references(() => empleados.id, { onDelete: 'set null' }),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').$onUpdate(() => new Date())
});

// ============================================================
// ENVIOS
// ============================================================

export const envios = pgTable('envios', {
	id: serial('id').primaryKey(),
	pedido_id: integer('pedido_id')
		.references(() => pedidos.id, { onDelete: 'cascade' })
		.notNull(),
	transportista_id: integer('transportista_id')
		.references(() => transportistas.id, { onDelete: 'restrict' })
		.notNull(),
	numero_guia: text('numero_guia'),
	cantidad_bultos: integer('cantidad_bultos').default(1),
	estado: text('estado', { enum: ['preparado', 'despachado', 'entregado'] })
		.notNull()
		.default('preparado'),
	fecha_envio: timestamp('fecha_envio'),
	fecha_entrega: timestamp('fecha_entrega'),
	observaciones: text('observaciones'),
	created_at: timestamp('created_at').defaultNow()
});

export const transportistas = pgTable('transportistas', {
	id: serial('id').primaryKey(),
	nombre: text('nombre').notNull(),
	activo: boolean('activo').default(true),
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// NOTIFICACIONES INTERNAS
// ============================================================

export const notificaciones = pgTable('notificaciones', {
	id: serial('id').primaryKey(),
	usuario_id: integer('usuario_id')
		.references(() => usuarios.id, { onDelete: 'cascade' })
		.notNull(),
	titulo: text('titulo').notNull(),
	mensaje: text('mensaje'),
	link: text('link'),
	leida: boolean('leida').default(false),
	created_at: timestamp('created_at').defaultNow()
});

// ============================================================
// TIPOS
// ============================================================

export type Usuario = typeof usuarios.$inferSelect;
export type Rol = typeof roles.$inferSelect;
export type Permiso = typeof permisos.$inferSelect;
export type Empleado = typeof empleados.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type LineaPedido = typeof lineas_pedido.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type OrdenFabricacion = typeof ordenes_fabricacion.$inferSelect;
export type UnidadFabricacion = typeof unidades_fabricacion.$inferSelect;
export type EstadoFabricacion = typeof estados_fabricacion.$inferSelect;
export type EstadoPedido = typeof estados_pedido.$inferSelect;
export type EstadoCotizacion = typeof estados_cotizacion.$inferSelect;
export type Cotizacion = typeof cotizaciones.$inferSelect;
export type LineaCotizacion = typeof lineas_cotizacion.$inferSelect;
export type AdjuntoCotizacion = typeof adjuntos_cotizacion.$inferSelect;
export type Notificacion = typeof notificaciones.$inferSelect;
export type TransicionEstado = typeof transiciones_estado.$inferSelect;
export type LogCambioEstado = typeof logs_cambios_estado.$inferSelect;
export type LogSistema = typeof logs_sistema.$inferSelect;
export type Tarea = typeof tareas.$inferSelect;
export type TipoMaterial = typeof tipos_material.$inferSelect;
export type MaterialEmpleado = typeof materiales_empleados.$inferSelect;
export type Insumos = typeof insumos.$inferSelect;
export type ProductoInsumo = typeof producto_insumos.$inferSelect;
export type PedidoInsumo = typeof pedido_insumos.$inferSelect;
