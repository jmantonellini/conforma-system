import * as v from 'valibot';

export const ProductoSchema = v.object({
	codigo: v.pipe(v.string(), v.nonEmpty('Código requerido')),
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	categoria_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	precio_base: v.optional(v.number(), 0),
	medidas_primario_diametro: v.optional(v.number()),
	medidas_primario_largo: v.optional(v.number()),
	medidas_secundario_diametro: v.optional(v.number()),
	medidas_secundario_largo: v.optional(v.number()),
	trombon_diametro_inicial: v.optional(v.number()),
	trombon_largo: v.optional(v.number()),
	trombon_observaciones: v.optional(v.string()),
	es_personalizable: v.optional(v.boolean(), false),
	tipo_vehiculo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	tipo_uso_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	categoria_competencia_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	marca_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	modelo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});

export const ProductoSchemaUpdate = v.object({
	...ProductoSchema.entries,
	id: v.string()
});
