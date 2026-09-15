import * as v from 'valibot';

export const InsumoSchema = v.object({
	codigo: v.pipe(v.string(), v.nonEmpty('Código requerido')),
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	tipo: v.pipe(v.string(), v.nonEmpty('Tipo requerido')),
	unidad: v.pipe(v.string(), v.nonEmpty('Unidad requerida')),
	costo_unitario: v.pipe(v.number(), v.toMinValue(0)),
	observaciones: v.optional(v.string()),
	categoria_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});

export const InsumoSchemaUpdate = v.object({
	...InsumoSchema.entries,
	id: v.string()
});

export const ImportarInsumosSchema = v.pipe(
	v.array(
		v.object({
			codigo: v.pipe(v.string(), v.nonEmpty('Código requerido')),
			nombre: v.pipe(v.string(), v.nonEmpty('Descripción requerida')),
			tipo: v.pipe(v.string(), v.nonEmpty('Tipo requerido')),
			unidad: v.pipe(v.string(), v.nonEmpty('Unidad requerida')),
			costo_unitario: v.pipe(v.number(), v.toMinValue(0)),
			observaciones: v.optional(v.string()),
			categoria_id: v.optional(v.number())
		})
	),
	v.maxLength(1000, 'El archivo no puede superar 1000 filas')
);
