<script lang="ts">
	import { FormFieldWrapper, Modal } from '$lib/ui';
	import type { LineaEdicion } from '$lib/modulos/cotizaciones/tipos';
	import { parsearNumeroDecimal } from '$lib/utils/precios';

	type Opcion = { id: number; nombre: string };
	type Props = {
		open?: boolean;
		contexto?: string;
		tipos: Opcion[];
		categorias: Opcion[];
		unidades: Opcion[];
		onAgregar: (insumo: NonNullable<LineaEdicion['nuevo_insumo']>) => void;
	};
	let {
		open = $bindable(false),
		contexto = 'cotización',
		tipos,
		categorias,
		unidades,
		onAgregar
	}: Props = $props();
	let nuevoInsumo = $state(formularioVacio());
	let costoUnitario = $derived(parsearNumeroDecimal(nuevoInsumo.costo_unitario));
	let valido = $derived(
		!!nuevoInsumo.nombre.trim() &&
			!!tipos.find((tipo) => tipo.id === Number(nuevoInsumo.tipo_id)) &&
			!!unidades.find((unidad) => unidad.id === Number(nuevoInsumo.unidad_id)) &&
			costoUnitario !== null &&
			costoUnitario >= 0
	);

	function formularioVacio() {
		return {
			nombre: '',
			tipo_id: tipos[0]?.id.toString() ?? '',
			categoria_id: '',
			unidad_id: unidades[0]?.id.toString() ?? '',
			costo_unitario: ''
		};
	}

	export function abrir(nombre = '') {
		nuevoInsumo = { ...formularioVacio(), nombre: nombre.trim() };
		open = true;
	}

	function confirmar() {
		if (!valido || costoUnitario === null) return;
		const tipo = tipos.find((opcion) => opcion.id === Number(nuevoInsumo.tipo_id));
		const unidad = unidades.find((opcion) => opcion.id === Number(nuevoInsumo.unidad_id));
		if (!tipo || !unidad) return;

		onAgregar({
			nombre: nuevoInsumo.nombre.trim(),
			tipo_id: tipo.id,
			categoria_id: Number(nuevoInsumo.categoria_id) || undefined,
			unidad_id: unidad.id,
			unidad: unidad.nombre,
			costo_unitario: costoUnitario
		});
		cerrar();
	}

	function cerrar() {
		open = false;
		nuevoInsumo = formularioVacio();
	}
</script>

<Modal
	bind:open
	titulo="Nuevo insumo"
	descripcion="Se incorpora al catálogo al guardar el {contexto}."
	alCerrar={() => (nuevoInsumo = formularioVacio())}
	accion={{ etiqueta: 'Agregar renglón', deshabilitada: !valido, onclick: confirmar }}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<FormFieldWrapper label="Nombre" id="nuevo-insumo-nombre" required class="sm:col-span-2">
			<input id="nuevo-insumo-nombre" class="input" bind:value={nuevoInsumo.nombre} />
		</FormFieldWrapper>
		<FormFieldWrapper label="Tipo" id="nuevo-insumo-tipo">
			<select id="nuevo-insumo-tipo" class="select" bind:value={nuevoInsumo.tipo_id}>
				<option value="">Seleccionar tipo...</option>
				{#each tipos as tipo (tipo.id)}
					<option value={String(tipo.id)}>{tipo.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper label="Categoría (opcional)" id="nuevo-insumo-categoria">
			<select id="nuevo-insumo-categoria" class="select" bind:value={nuevoInsumo.categoria_id}>
				<option value="">Sin categoría</option>
				{#each categorias as categoria (categoria.id)}
					<option value={String(categoria.id)}>{categoria.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper label="Unidad" id="nuevo-insumo-unidad">
			<select id="nuevo-insumo-unidad" class="select" bind:value={nuevoInsumo.unidad_id}>
				<option value="">Seleccionar unidad...</option>
				{#each unidades as unidad (unidad.id)}
					<option value={String(unidad.id)}>{unidad.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper label="Costo por unidad" id="nuevo-insumo-costo">
			<input
				id="nuevo-insumo-costo"
				class="input"
				type="text"
				inputmode="decimal"
				bind:value={nuevoInsumo.costo_unitario}
			/>
		</FormFieldWrapper>
	</div>
</Modal>
