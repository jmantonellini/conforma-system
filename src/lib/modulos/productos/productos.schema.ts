import * as v from 'valibot';

const anio = v.optional(
	v.pipe(
		v.number(),
		v.integer('El año debe ser un número entero'),
		v.minValue(1900, 'El año debe ser 1900 o posterior'),
		v.maxValue(2100, 'El año debe ser 2100 o anterior')
	)
);

type Anios = { anio_desde?: number; anio_hasta?: number };

const aniosOrdenados = ({ anio_desde, anio_hasta }: Anios) =>
	anio_desde == null || anio_hasta == null || anio_desde <= anio_hasta;

const MENSAJE_ANIOS = 'El año hasta no puede ser anterior al año desde';

const camposProducto = {
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
	anio_desde: anio,
	anio_hasta: anio,
	receta: v.optional(v.string())
};

export const ProductoSchema = v.pipe(
	v.object(camposProducto),
	v.forward(v.partialCheck([['anio_desde'], ['anio_hasta']], aniosOrdenados, MENSAJE_ANIOS), [
		'anio_hasta'
	])
);

export const ProductoSchemaUpdate = v.pipe(
	v.object({
		...camposProducto,
		id: v.string(),
		codigo: v.optional(v.pipe(v.string(), v.trim()), ''),
		receta: v.optional(v.string())
	}),
	v.forward(v.partialCheck([['anio_desde'], ['anio_hasta']], aniosOrdenados, MENSAJE_ANIOS), [
		'anio_hasta'
	])
);

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
