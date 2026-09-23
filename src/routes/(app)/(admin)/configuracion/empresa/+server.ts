import { error, json } from '@sveltejs/kit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '$lib/server/db';
import { configuracion_empresa } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth/permissions';

export const POST = async ({ request }) => {
	await requirePermission('configuracion', 'edit');
	const formData = await request.formData();
	const file = formData.get('logo');
	if (!(file instanceof File) || !file.type.startsWith('image/')) throw error(400, 'Logo inválido');

	const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
	const filename = `logo-${Date.now()}.${extension}`;
	const directory = path.resolve('static/uploads/configuracion');
	await mkdir(directory, { recursive: true });
	await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

	const logoUrl = `/uploads/configuracion/${filename}`;
	await db
		.insert(configuracion_empresa)
		.values({ id: 1, logo_url: logoUrl })
		.onConflictDoUpdate({
			target: configuracion_empresa.id,
			set: { logo_url: logoUrl, updated_at: new Date() }
		});

	return json({ logoUrl });
};
