import type { PageServerLoad } from './$types';
import { usuarios } from '$lib/server/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export const load = (async ({ locals }) => {
	const users = await locals.db.select().from(usuarios);

	return { users };
}) satisfies PageServerLoad;

export const actions = {
	deleteUser: async ({ request, locals }) => {
		const formData = await request.formData();
		const userId = formData.get('userId');

		if (typeof userId !== 'string') {
			return { success: false, message: 'Invalid user ID' };
		}

		try {
			await locals.db.delete(usuarios).where(eq(usuarios.id, userId as unknown as number));
			return { success: true };
		} catch (error) {
			console.error('Error deleting user:', error);
			return { success: false, message: 'Failed to delete user' };
		}
	},

	createUser: async ({ request, locals }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (typeof username !== 'string' || typeof password !== 'string') {
			return { success: false, message: 'Invalid input' };
		}

		try {
			await locals.db.insert(usuarios).values({
				username,
				password_hash: bcrypt.hashSync(password, 10)
			});
			return { success: true };
		} catch (error) {
			console.error('Error creating user:', error);
			return { success: false, message: 'Failed to create user' };
		}
	}
};
