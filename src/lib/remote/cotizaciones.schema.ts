import * as v from 'valibot';

export const LineaCotizacionSchema = v.object({
	producto_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	es_personalizado: v.optional(v.boolean(), false),
	descripcion: v.pipe(v.string(), v.nonEmpty('La descripción es requerida')),
	cantidad: v.pipe(v.number(), v.toMinValue(1)),
	precio_unitario: v.pipe(v.number(), v.toMinValue(0)),
	// Base para las futuras fórmulas de costos
	costo_mano_obra: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0),
	costo_materiales: v.optional(v.pipe(v.number(), v.toMinValue(0)), 0)
});

export const CotizacionSchema = v.object({
	cliente_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	cliente_nombre: v.pipe(v.string(), v.nonEmpty('Indicá el nombre del contacto')),
	cliente_telefono: v.optional(v.string()),
	cliente_email: v.optional(v.string()),
	canal: v.optional(v.string(), 'whatsapp'),
	descripcion: v.pipe(v.string(), v.nonEmpty('Describí la consulta recibida')),
	observaciones: v.optional(v.string())
});
