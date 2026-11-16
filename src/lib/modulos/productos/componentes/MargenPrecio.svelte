<script lang="ts">
	import type { RemoteFormField } from '@sveltejs/kit';
	import { FormFieldWrapper } from '$lib/ui';
	import {
		MARGEN_MAX_PORCENTAJE,
		calcularMargenDesdePrecio,
		calcularPrecioVenta
	} from '$lib/utils/precios';

	let {
		field,
		costo,
		inicial = 0
	}: { field: RemoteFormField<number>; costo: number; inicial?: number } = $props();

	let editandoPrecio = $state(false);
	let precioTexto = $state('');

	const margen = $derived(Number(field.value() ?? inicial) || 0);
	const margenValido = $derived(margen >= 0 && margen <= MARGEN_MAX_PORCENTAJE);
	const precio = $derived(margenValido ? calcularPrecioVenta(costo, margen) : null);
	const precioTipeado = $derived(Number(precioTexto.replace(',', '.')));
	const aviso = $derived.by(() => {
		if (costo <= 0) return 'Cargá la receta para calcular el precio';
		if (editandoPrecio && precioTexto && precioTipeado <= costo) {
			return 'El precio debe ser mayor al costo';
		}
		if (!margenValido) return `El margen debe estar entre 0 y ${MARGEN_MAX_PORCENTAJE}%`;
		return undefined;
	});

	function alEscribirPrecio(texto: string) {
		precioTexto = texto;
		const nuevo = calcularMargenDesdePrecio(costo, precioTipeado);
		if (nuevo !== null) field.set(nuevo);
	}
</script>

<FormFieldWrapper label="Precio de lista (US$)" id="precio_lista" error={aviso}>
	<input
		id="precio_lista"
		class="input text-right font-semibold input-sm"
		type="number"
		min="0"
		step="0.01"
		disabled={costo <= 0}
		value={editandoPrecio ? precioTexto : (precio ?? '')}
		onfocus={() => {
			editandoPrecio = true;
			precioTexto = precio === null ? '' : String(precio);
		}}
		oninput={(event) => alEscribirPrecio(event.currentTarget.value)}
		onblur={() => (editandoPrecio = false)}
	/>
</FormFieldWrapper>
<FormFieldWrapper label="Margen (%)" id="margen_porcentaje">
	<input
		id="margen_porcentaje"
		class="input text-right input-sm"
		min="0"
		max={MARGEN_MAX_PORCENTAJE}
		step="0.0001"
		{...field.as('number', inicial)}
	/>
</FormFieldWrapper>
