import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import SearchSelect from './SearchSelect.svelte';

it('filters quotation contacts and reports the selected contact', async () => {
	let selectedContactId = '';
	const onChange = vi.fn();
	const field = {
		value: () => selectedContactId,
		set: (value: string) => (selectedContactId = value),
		as: () => ({ name: 'contacto_id' })
	};

	await render(SearchSelect, {
		id: 'contacto_id',
		label: 'Cliente',
		field,
		options: [
			{ value: '41', label: 'Aceros del Sur' },
			{ value: '42', label: 'Collino SRL' }
		],
		onChange
	});

	const selector = page.getByRole('combobox', { name: 'Cliente' });
	await selector.fill('Collino');
	const options = page.getByRole('listbox');
	await expect.element(options.getByRole('option', { name: 'Collino SRL' })).toBeVisible();
	await expect
		.element(options.getByRole('option', { name: 'Aceros del Sur' }))
		.not.toBeInTheDocument();
	await options.getByRole('option', { name: 'Collino SRL' }).click();

	expect(selectedContactId).toBe('42');
	expect(onChange).toHaveBeenCalledWith('42');
});
