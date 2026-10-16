import * as v from 'valibot';

export const LineaCotizacionSchema = v.object({
	visible_cliente: v.optional(v.boolean(), true),
	producto_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	insumo_id: v.optional(v.number()),
	nuevo_insumo: v.optional(
		v.object({
			nombre: v.pipe(v.string(), v.nonEmpty('El nombre del insumo es requerido')),
			tipo_id: v.pipe(v.number(), v.toMinValue(1)),
			categoria_id: v.optional(v.pipe(v.number(), v.toMinValue(1))),
			unidad_id: v.pipe(v.number(), v.toMinValue(1)),
			unidad: v.pipe(v.string(), v.nonEmpty('La unidad es requerida')),
			costo_unitario: v.pipe(v.number(), v.toMinValue(0))
		})
	),
	descripcion: v.pipe(v.string(), v.nonEmpty('La descripción es requerida')),
	cantidad: v.pipe(v.number(), v.toMinValue(1)),
	precio_unitario: v.pipe(v.number(), v.toMinValue(0)),
	precio_lista_unitario: v.optional(v.pipe(v.number(), v.toMinValue(0))),
	costo_materiales: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0)
});

export const CotizacionSchema = v.object({
	contacto_id: v.pipe(
		v.string(),
		v.nonEmpty('Seleccioná un contacto'),
		v.transform(Number),
		v.number(),
		v.toMinValue(1)
	),
	contacto_distribuidor_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	canal: v.optional(v.string(), 'whatsapp'),
	descripcion: v.pipe(v.string(), v.nonEmpty('Describí la consulta recibida')),
	observaciones: v.optional(v.string())
});
