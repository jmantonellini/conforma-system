import * as v from 'valibot';

export const LoginSchema = v.object({
	username: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.nonEmpty('Usuario requerido')),
	password: v.pipe(v.string(), v.nonEmpty('Contraseña requerida'))
});
