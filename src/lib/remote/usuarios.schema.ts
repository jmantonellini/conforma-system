import * as v from 'valibot';

export const CrearUsuarioSchema = v.object({
	username: v.pipe(v.string(), v.nonEmpty('Usuario requerido')),
	password_hash: v.pipe(
		v.string(),
		v.minLength(4, 'La contraseña debe tener al menos 4 caracteres')
	),
	empleado_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	rol_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});

export const ActualizarUsuarioSchema = v.object({
	id: v.pipe(v.string(), v.transform(Number), v.number()),
	username: v.pipe(v.string(), v.nonEmpty('Usuario requerido')),
	password_hash: v.optional(
		v.union([
			v.literal(''),
			v.pipe(v.string(), v.minLength(4, 'La contraseña debe tener al menos 4 caracteres'))
		])
	),
	empleado_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	rol_id: v.optional(v.pipe(v.string(), v.transform(Number), v.number()))
});
