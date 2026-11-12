import { boolean, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { actualizado, aislamiento, creado, empresa, importe, porcentaje } from './base';

export const contactos = pgTable(
	'contactos',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		razon_social: text('razon_social').notNull(),
		nombre: text('nombre'),
		apellido: text('apellido'),
		cuit: text('cuit'),
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
		porcentaje_compensacion: porcentaje('porcentaje_compensacion').default(0),
		saldo_disponible: importe('saldo_disponible').default(0),
		activo: boolean('activo').default(true),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [uniqueIndex('idx_contactos_empresa_cuit').on(t.empresa_id, t.cuit), aislamiento()]
);

export const proveedores = pgTable(
	'proveedores',
	{
		id: serial('id').primaryKey(),
		empresa_id: empresa(),
		contacto_id: integer('contacto_id')
			.references(() => contactos.id, { onDelete: 'restrict' })
			.notNull(),
		codigo: text('codigo'),
		contacto_nombre: text('contacto_nombre'),
		contacto_email: text('contacto_email'),
		contacto_telefono: text('contacto_telefono'),
		condiciones_pago: text('condiciones_pago'),
		activo: boolean('activo').default(true),
		created_at: creado(),
		updated_at: actualizado()
	},
	(t) => [
		uniqueIndex('idx_proveedor_contacto').on(t.contacto_id),
		uniqueIndex('idx_proveedores_empresa_codigo').on(t.empresa_id, t.codigo),
		aislamiento()
	]
);
