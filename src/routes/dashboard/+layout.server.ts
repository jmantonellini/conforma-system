import type { LayoutServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	const session = cookies.get('session');
	return {
		session
	};
}) satisfies LayoutServerLoad;
