import { usuarios } from '$lib/server/db/schema';
import bcrypt from 'bcryptjs';

export const actions = {
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
