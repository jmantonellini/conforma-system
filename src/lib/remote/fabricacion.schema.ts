import * as v from 'valibot';

export const CrearOrdenSchema = v.object({
	linea_pedido_id: v.pipe(
		v.string(),
		v.nonEmpty('Selecciona una línea de pedido'),
		v.transform(Number),
		v.number(),
		v.integer('Selecciona una línea de pedido válida'),
		v.minValue(1, 'Selecciona una línea de pedido válida')
	),
	nombre_trabajo: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	cantidad_total: v.number(),
	prioridad: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '0'),
	fecha_fin_estimada: v.optional(v.string()),
	asignado_a: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	observaciones: v.optional(v.string())
});
