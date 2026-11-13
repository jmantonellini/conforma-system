import * as v from 'valibot';

export const ProductoSchema = v.object({
	codigo: v.optional(v.pipe(v.string(), v.trim()), ''),
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	categoria_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	margen_porcentaje: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(99.99)), 0),
	atributos: v.optional(
		v.pipe(
			v.string(),
			v.parseJson(),
			v.record(v.string(), v.nullable(v.union([v.string(), v.number()])))
		)
	),
	notas_fabricacion: v.optional(v.string()),
	es_personalizable: v.optional(v.boolean(), false),
	tipo_vehiculo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	tipo_uso_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	categoria_competencia_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	marca_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	modelo_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	receta: v.optional(v.string())
});

export const ProductoSchemaUpdate = v.object({
	...ProductoSchema.entries,
	id: v.string(),
	codigo: v.optional(v.pipe(v.string(), v.trim()), ''),
	receta: v.optional(v.string())
});

export type DatosProducto = v.InferOutput<typeof ProductoSchema>;
export type DatosProductoActualizado = v.InferOutput<typeof ProductoSchemaUpdate>;

const idOpcional = v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)));

export const ProductoRapidoSchema = v.object({
	nombre: v.pipe(v.string(), v.trim(), v.nonEmpty('Nombre requerido'), v.maxLength(200)),
	categoria_id: idOpcional,
	tipo_vehiculo_id: idOpcional,
	marca_id: idOpcional,
	modelo_id: idOpcional,
	atributos: v.optional(v.record(v.string(), v.nullable(v.union([v.string(), v.number()])))),
	notas_fabricacion: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000)))
});
