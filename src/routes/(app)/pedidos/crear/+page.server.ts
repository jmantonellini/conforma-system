import { requirePermission } from '$lib/server/auth/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	await requirePermission('importes', 'view');
};
