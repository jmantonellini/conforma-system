import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
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
	cantidad,
	creado,
	empresa,
	fecha,
	importe,
	moneda,
	porcentaje,
	precioUnitario,
	tipoCambio
} from './base';
import { usuarios } from './acceso';
import { contactos } from './contactos';
import { lineas_cotizacion } from './cotizaciones';
import { estados } from './estados';
import { insumos } from './insumos';
import type { ValoresAtributos } from '$lib/modulos/productos/atributos';
import { productos } from './productos';

export const pedidos = pgTable(
	'pedidos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		numero_pedido: text('numero_pedido').notNull(),
		contacto_id: integer('contacto_id')
			.references(() => contactos.id, { onDelete: 'restrict' })
			.notNull(),
		contacto_distribuidor_id: integer('contacto_distribuidor_id').references(() => contactos.id, {
			onDelete: 'set null'
		}),
		usar_credito_distribuidor: boolean('usar_credito_distribuidor').default(false),
		monto_credito_distribuidor: importe('monto_credito_distribuidor').default(0),
		porcentaje_comision_distribuidor: porcentaje('porcentaje_comision_distribuidor').default(0),
		monto_comision_distribuidor: importe('monto_comision_distribuidor').default(0),
		comision_distribuidor_descontada: boolean('comision_distribuidor_descontada').default(false),
		fecha_pedido: fecha('fecha_pedido').notNull(),
		fecha_entrega_prometida: fecha('fecha_entrega_prometida'),
		fecha_entrega_real: fecha('fecha_entrega_real'),
		estado_id: integer('estado_id')
			.references(() => estados.id, { onDelete: 'restrict' })
			.notNull(),
		moneda: moneda(),
		tipo_cambio: tipoCambio('tipo_cambio'),
		precio_total: importe('precio_total'),
		anticipo: importe('anticipo'),
		creado_por: integer('creado_por').references(() => usuarios.id, { onDelete: 'set null' }),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		uniqueIndex('idx_pedidos_empresa_numero').on(t.empresa_id, t.numero_pedido),
		check('pedidos_moneda_valida', sql`${t.moneda} IN ('USD', 'ARS')`),
		check('pedidos_ars_con_cambio', sql`${t.moneda} = 'USD' OR ${t.tipo_cambio} > 0`),
		aislamiento()
	]
);

export const lineas_pedido = pgTable(
	'lineas_pedido',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		pedido_id: integer('pedido_id')
			.references(() => pedidos.id, { onDelete: 'cascade' })
			.notNull(),
		producto_id: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
		es_personalizado: boolean('es_personalizado').default(false),
		descripcion_personalizada: text('descripcion_personalizada'),
		fecha_envio_parcial: fecha('fecha_envio_parcial'),
		atributos: jsonb('atributos').$type<ValoresAtributos>().notNull().default({}),
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
	(t) => [index('idx_lineas_pedido').on(t.pedido_id), aislamiento()]
);

export const pedido_insumos = pgTable(
	'pedido_insumos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		pedido_id: integer('pedido_id')
			.references(() => pedidos.id, { onDelete: 'cascade' })
			.notNull(),
		insumo_id: integer('insumo_id')
			.references(() => insumos.id, { onDelete: 'restrict' })
			.notNull(),
		cantidad: cantidad('cantidad').notNull().default(1),
		unidad: text('unidad').notNull(),
		costo_unitario: precioUnitario('costo_unitario'),
		precio_lista_unitario: precioUnitario('precio_lista_unitario').notNull().default(0),
		precio_unitario: precioUnitario('precio_unitario').notNull().default(0),
		cotizacion_linea_id: integer('cotizacion_linea_id').references(() => lineas_cotizacion.id, {
			onDelete: 'set null'
		}),
		observaciones: text('observaciones'),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [index('idx_pedido_insumos_pedido').on(t.pedido_id), aislamiento()]
);

export const pagos = pgTable(
	'pagos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		pedido_id: integer('pedido_id')
			.references(() => pedidos.id, { onDelete: 'cascade' })
			.notNull(),
		monto: importe('monto').notNull(),
		cantidad_cuotas: integer('cantidad_cuotas'),
		fecha_pago: fecha('fecha_pago').defaultNow(),
		metodo_pago: text('metodo_pago'),
		observaciones: text('observaciones'),
		created_at: creado()
	},
	() => [aislamiento()]
);

export const transportistas = pgTable(
	'transportistas',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		nombre: text('nombre').notNull(),
		activo: boolean('activo').default(true),
		created_at: creado()
	},
	() => [aislamiento()]
);

export const envios = pgTable(
	'envios',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
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
		fecha_envio: fecha('fecha_envio'),
		fecha_entrega: fecha('fecha_entrega'),
		observaciones: text('observaciones'),
		created_at: creado()
	},
	() => [aislamiento()]
);
