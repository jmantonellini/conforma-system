export function toOptionalId(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === '') return undefined;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function toSlug(value: string) {
	return value
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
