import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import {
	actualizado,
	aislamiento,
	creado,
	empresa,
	fecha,
	importe,
	porcentaje,
	precioUnitario
} from './base';
import { empleados, usuarios } from './acceso';
import { contactos } from './contactos';
import { estados } from './estados';
import { insumos } from './insumos';
import { pedidos } from './pedidos';
import { productos } from './productos';

export const cotizaciones = pgTable(
	'cotizaciones',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		numero_cotizacion: text('numero_cotizacion').notNull(),
		contacto_id: integer('contacto_id')
			.references(() => contactos.id, { onDelete: 'restrict' })
			.notNull(),
		contacto_distribuidor_id: integer('contacto_distribuidor_id').references(() => contactos.id, {
			onDelete: 'set null'
		}),
		canal: text('canal').notNull().default('whatsapp'),
		descripcion: text('descripcion').notNull(),
		estado_id: integer('estado_id')
			.references(() => estados.id, { onDelete: 'restrict' })
			.notNull(),
		asignada_a: integer('asignada_a').references(() => empleados.id, { onDelete: 'set null' }),
		creada_por: integer('creada_por').references(() => usuarios.id, { onDelete: 'set null' }),
		precio_total: importe('precio_total'),
		descuento_global_porcentaje: porcentaje('descuento_global_porcentaje').notNull().default(0),
		incluir_iva: boolean('incluir_iva').notNull().default(false),
		condiciones_pago: text('condiciones_pago'),
		validez_dias: integer('validez_dias').default(15),
		fecha_envio: fecha('fecha_envio'),
		pedido_id: integer('pedido_id').references(() => pedidos.id, { onDelete: 'set null' }),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		uniqueIndex('idx_cotizaciones_empresa_numero').on(t.empresa_id, t.numero_cotizacion),
		aislamiento()
	]
);

export const lineas_cotizacion = pgTable(
	'lineas_cotizacion',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		cotizacion_id: integer('cotizacion_id')
			.references(() => cotizaciones.id, { onDelete: 'cascade' })
			.notNull(),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
		insumo_id: integer('insumo_id').references(() => insumos.id, { onDelete: 'set null' }),
		es_personalizado: boolean('es_personalizado').default(false),
		visible_cliente: boolean('visible_cliente').notNull().default(true),
		descripcion: text('descripcion').notNull(),
		cantidad: integer('cantidad').notNull().default(1),
		precio_unitario: precioUnitario('precio_unitario').notNull(),
		subtotal: importe('subtotal').generatedAlwaysAs(sql`cantidad * precio_unitario`),
		precio_lista_unitario: precioUnitario('precio_lista_unitario').notNull().default(0),
		margen_porcentaje: porcentaje('margen_porcentaje').notNull().default(0),
		costo_materiales: precioUnitario('costo_materiales').notNull().default(0),
		insumos_snapshot: jsonb('insumos_snapshot'),
		orden_linea: integer('orden_linea'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [index('idx_lineas_cotizacion').on(t.cotizacion_id), aislamiento()]
);

export const notas_cotizacion = pgTable(
	'notas_cotizacion',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		cotizacion_id: integer('cotizacion_id')
			.references(() => cotizaciones.id, { onDelete: 'cascade' })
			.notNull(),
		usuario_id: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
		contenido: text('contenido').notNull(),
		created_at: creado()
	},
	(t) => [index('idx_notas_cotizacion').on(t.cotizacion_id), aislamiento()]
);
