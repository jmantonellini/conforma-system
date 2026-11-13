<script lang="ts">
	import { resolve } from '$app/paths';
	import { FormFieldWrapper, Modal } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import {
		crearProductoRapido,
		getAtributosCategoria,
		getCategorias,
		getMarcas,
		getModelos,
		getTiposVehiculo
	} from '$lib/modulos/productos/productos.remote';
	import AtributosCampos from './AtributosCampos.svelte';
	import type { ValoresAtributos } from '../atributos';

	type Creado = Awaited<ReturnType<typeof crearProductoRapido>>;

	let { onCreado }: { onCreado: (producto: Creado) => void } = $props();

	let open = $state(false);
	let guardando = $state(false);
	let nombre = $state('');
	let categoriaId = $state('');
	let tipoVehiculoId = $state('');
	let marcaId = $state('');
	let modeloId = $state('');
	let notas = $state('');
	let atributos = $state<ValoresAtributos>({});

	const categorias = $derived(open ? await getCategorias() : []);
	const tiposVehiculo = $derived(open ? await getTiposVehiculo() : []);
	const marcas = $derived(open ? await getMarcas() : []);
	const modelos = $derived(marcaId ? await getModelos(Number(marcaId)) : []);
	const definiciones = $derived(
		categoriaId ? await getAtributosCategoria(Number(categoriaId)) : []
	);

	export function abrir(texto = '') {
		nombre = texto.trim();
		categoriaId = '';
		tipoVehiculoId = '';
		marcaId = '';
		modeloId = '';
		notas = '';
		atributos = {};
		open = true;
	}

	const id = (valor: string) => Number(valor) || undefined;

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!nombre.trim() || guardando) return;
		guardando = true;
		try {
			const producto = await crearProductoRapido({
				nombre: nombre.trim(),
				categoria_id: id(categoriaId),
				tipo_vehiculo_id: id(tipoVehiculoId),
				marca_id: id(marcaId),
				modelo_id: id(modeloId),
				atributos,
				notas_fabricacion: notas.trim() || undefined
			});
			onCreado(producto);
			open = false;
			toast.success('Producto creado. Su receta queda pendiente.');
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo crear el producto'));
		} finally {
			guardando = false;
		}
	}
</script>

<Modal
	bind:open
	lateral
	titulo="Nuevo producto"
	descripcion="Con lo básico y las medidas alcanza. La receta se completa después, desde la cotización o la ficha del producto."
	accion={{
		etiqueta: 'Crear y usar',
		form: 'producto-rapido',
		pendiente: guardando,
		deshabilitada: !nombre.trim()
	}}
>
	<form id="producto-rapido" class="flex flex-col gap-1" onsubmit={guardar}>
		<FormFieldWrapper id="rapido-producto-nombre" label="Nombre" required>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id="rapido-producto-nombre"
				class="input w-full"
				autofocus
				placeholder="Ej.: Escape completo Ford Ranger 3.2"
				bind:value={nombre}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper
			id="rapido-producto-categoria"
			label="Categoría"
			ayuda="Define qué medidas se piden."
		>
			<select
				id="rapido-producto-categoria"
				class="select w-full"
				bind:value={categoriaId}
				onchange={() => (atributos = {})}
			>
				<option value="">Sin categoría</option>
				{#each categorias as categoria (categoria.id)}
					<option value={String(categoria.id)}>{categoria.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<div class="grid grid-cols-2 gap-3">
			<FormFieldWrapper id="rapido-producto-marca" label="Marca">
				<select
					id="rapido-producto-marca"
					class="select w-full"
					bind:value={marcaId}
					onchange={() => (modeloId = '')}
				>
					<option value="">-</option>
					{#each marcas as marca (marca.id)}
						<option value={String(marca.id)}>{marca.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper id="rapido-producto-modelo" label="Modelo">
				<select
					id="rapido-producto-modelo"
					class="select w-full"
					bind:value={modeloId}
					disabled={!marcaId}
				>
					<option value="">-</option>
					{#each modelos as modelo (modelo.id)}
						<option value={String(modelo.id)}>{modelo.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>
		</div>
		<FormFieldWrapper id="rapido-producto-vehiculo" label="Tipo de vehículo">
			<select id="rapido-producto-vehiculo" class="select w-full" bind:value={tipoVehiculoId}>
				<option value="">-</option>
				{#each tiposVehiculo as tipo (tipo.id)}
					<option value={String(tipo.id)}>{tipo.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		{#if definiciones.length}
			<div class="mt-2 rounded-box border border-base-300 p-3">
				<p class="mb-2 text-sm font-semibold">Medidas</p>
				<AtributosCampos {definiciones} bind:valores={atributos} nombre="" compacto />
			</div>
		{/if}
		<FormFieldWrapper id="rapido-producto-notas" label="Notas de fabricación">
			<textarea
				id="rapido-producto-notas"
				class="textarea w-full"
				rows="2"
				maxlength="2000"
				bind:value={notas}></textarea>
		</FormFieldWrapper>
		<p class="text-sm text-base-content/60">
			Fotos, planos y margen se cargan desde
			<a class="link" href={resolve('/productos')} target="_blank">Productos</a>.
		</p>
	</form>
</Modal>
