<script lang="ts">
	import CamposEntrega from '$lib/modulos/pedidos/componentes/CamposEntrega.svelte';
	import { ENTREGA_VACIA, type ModalidadEntrega } from '$lib/modulos/ventas/trabajo';

	type Inicial = {
		entrega_transportista?: string | null;
		entrega_modalidad?: ModalidadEntrega | null;
		entrega_direccion?: string | null;
		entrega_localidad?: string | null;
		entrega_provincia?: string | null;
		entrega_codigo_postal?: string | null;
		entrega_recibe?: string | null;
		entrega_telefono?: string | null;
		entrega_indicaciones?: string | null;
		entrega_consumidor_final?: boolean | null;
	};

	let {
		campos,
		inicial,
		disabled = false
	}: {
		campos: Record<string, unknown>;
		inicial?: Inicial;
		disabled?: boolean;
	} = $props();

	const CLAVES = [
		'transportista',
		'modalidad',
		'direccion',
		'localidad',
		'provincia',
		'codigo_postal',
		'recibe',
		'telefono',
		'indicaciones',
		'consumidor_final'
	] as const;

	const camposEntrega = $derived(
		Object.fromEntries(CLAVES.map((clave) => [clave, campos[`entrega_${clave}`]]))
	);
	const datos = $derived({
		...ENTREGA_VACIA,
		...Object.fromEntries(
			CLAVES.map((clave) => [clave, inicial?.[`entrega_${clave}`] ?? ENTREGA_VACIA[clave]])
		)
	});
</script>

<fieldset class="fieldset seccion">
	<legend class="fieldset-legend">Datos de entrega</legend>
	<p class="secundario -mt-1 mb-2">
		Se usan en cada pedido nuevo para despachar apenas esté terminado.
	</p>
	<CamposEntrega
		prefijo="contacto-entrega"
		campos={camposEntrega as never}
		inicial={datos}
		{disabled}
	/>
</fieldset>
