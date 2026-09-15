<script lang="ts">
	import { resolve } from '$app/paths';
	import { Highlight, PageLayout, FormFieldWrapper, Table } from '$lib/components/ui';
	import { Delete, Edit, Excel } from '$lib/components/ui/icons';
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		crearInsumo,
		eliminarInsumo,
		getCategoriasInsumo,
		getInsumos,
		getTiposInsumo,
		getUnidadesInsumo,
		importarInsumos
	} from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let datosActualizados = $state<typeof data.insumos>();
	let datos = $derived(datosActualizados ?? data.insumos);
	let busqueda = $state('');
	let tipo = $state('');
	let categoriaId = $state('');
	let archivo = $state<File | undefined>();
	let importando = $state(false);
	let filasImportacion = $state<ImportacionFila[]>([]);
	let erroresImportacion = $state<string[]>([]);
	let modal = $state<'crear' | 'excel' | null>(null);

	type ImportacionFila = {
		codigo: string;
		nombre: string;
		tipo: string;
		unidad: string;
		costo_unitario: number;
		observaciones?: string;
	};

	function closeModal() {
		modal = null;
	}

	async function refrescar() {
		datosActualizados = await getInsumos({
			search: busqueda || undefined,
			tipo: tipo || undefined,
			categoriaId: categoriaId ? Number(categoriaId) : undefined,
			limit: 100
		});
	}

	async function guardar(form: HTMLFormElement) {
		try {
			if (await crearInsumo.submit()) {
				form.reset();
				closeModal();
				await refrescar();
				toast.success('Insumo creado');
			}
		} catch {
			toast.error('No se pudo crear el insumo');
		}
	}

	async function analizarExcel() {
		const seleccionado = archivo;
		if (!seleccionado) return toast.error('Seleccioná un archivo Excel');
		importando = true;
		filasImportacion = [];
		erroresImportacion = [];
		try {
			const formData = new FormData();
			formData.set('archivo', seleccionado);
			const respuesta = await fetch('/insumos/importar', { method: 'POST', body: formData });
			const resultado = (await respuesta.json()) as {
				error?: string;
				errores?: string[];
				filas?: ImportacionFila[];
				cantidad?: number;
			};
			if (!respuesta.ok)
				throw new Error([resultado.error, ...(resultado.errores ?? [])].filter(Boolean).join('. '));
			filasImportacion = resultado.filas ?? [];
			toast.success(`${resultado.cantidad ?? 0} filas listas para importar`);
		} catch (error) {
			erroresImportacion = [
				error instanceof Error ? error.message : 'No se pudo analizar el archivo'
			];
		} finally {
			importando = false;
		}
	}

	async function confirmarImportacion() {
		try {
			const resultado = await importarInsumos(filasImportacion);
			filasImportacion = [];
			archivo = undefined;
			await refrescar();
			closeModal();
			toast.success(`${resultado.cantidad} insumos importados`);
		} catch {
			toast.error('No se pudo importar el listado');
		}
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between gap-3">
			<div class="flex gap-3">
				<input
					class="input w-72"
					placeholder="Buscar código o descripción"
					bind:value={busqueda}
					oninput={refrescar}
				/>
				<select class="select" bind:value={tipo} onchange={refrescar}>
					<option value="">Todos los tipos</option>
					<option value="material">Material</option>
					<option value="mano_obra">Mano de obra</option>
					<option value="indirecto">Costo indirecto</option>
					<option value="herramienta">Herramienta</option>
				</select>
				<select class="select" bind:value={categoriaId} onchange={refrescar}>
					<option value="">Todas las categorías</option>
					{#each await getCategoriasInsumo() as categoria (categoria.id)}
						<option value={String(categoria.id)}>{categoria.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="flex gap-3">
				<button class="btn btn-outline" onclick={() => (modal = 'excel')}><Excel /> Excel</button>
				<button class="btn btn-primary" onclick={() => (modal = 'crear')}>+ Nuevo insumo</button>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body p-0">
				{#snippet header()}
					<th>Código</th><th>Descripción</th><th>Tipo</th><th>Categoría</th><th>Unidad</th><th
						class="text-right">Costo vigente</th
					><th>Acciones</th>
				{/snippet}
				{#snippet row(insumo: (typeof data.insumos.data)[number])}
					<td class="font-mono text-sm"><Highlight text={insumo.codigo} query={busqueda} /></td>
					<td class="font-medium"><Highlight text={insumo.nombre} query={busqueda} /></td>
					<td
						><span class="badge badge-ghost"
							><Highlight
								text={typeof insumo.tipo === 'object' ? insumo.tipo?.nombre : insumo.tipo}
								query={busqueda}
							/></span
						></td
					>
					<td><Highlight text={insumo.categoria?.nombre ?? 'Sin categoría'} query={busqueda} /></td>
					<td>{insumo.unidad}</td>
					<td class="text-right"
						>${insumo.costo_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td
					>
					<td>
						<div class="flex justify-center gap-2">
							<a
								class="btn btn-circle btn-ghost btn-sm"
								title="Editar"
								href={resolve(`/insumos/${insumo.id}`)}
							>
								<Edit />
							</a>
							<button
								class="btn btn-circle btn-ghost text-error btn-sm"
								title="Eliminar"
								onclick={async () => {
									await eliminarInsumo(insumo.id);
									await refrescar();
									toast.success('Insumo eliminado');
								}}><Delete /></button
							>
						</div>
					</td>
				{/snippet}
				<Table data={datos.data} {header} {row} emptyMessage="No hay insumos registrados" />
			</div>
		</div>
	</div>
</PageLayout>

<Modal
	open={modal !== null}
	title={modal === 'crear' ? 'Nuevo insumo' : 'Importar insumos desde Excel'}
	onClose={closeModal}
>
	{#if modal === 'crear'}
		<form {...crearInsumo.enhance(async (form) => guardar(form.element))} id="insumo-form">
			<div class="grid gap-4 md:grid-cols-2">
				<FormFieldWrapper label="Código" id="codigo" required>
					<input class="input" {...crearInsumo.fields.codigo.as('text')} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Descripción" id="nombre" required>
					<input class="input" {...crearInsumo.fields.nombre.as('text')} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Tipo" id="tipo">
					<select class="select" {...crearInsumo.fields.tipo.as('select')}>
						{#each await getTiposInsumo() as tipo (tipo.id)}
							<option value={String(tipo.id)}>{tipo.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Categoría" id="categoria_id">
					<select class="select" {...crearInsumo.fields.categoria_id.as('select')}>
						<option value="">Sin categoría</option>
						{#each await getCategoriasInsumo() as categoria (categoria.id)}
							<option value={String(categoria.id)}>{categoria.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Unidad" id="unidad" required>
					<select class="select" {...crearInsumo.fields.unidad.as('select')}>
						{#each await getUnidadesInsumo() as unidad (unidad)}
							<option value={String(unidad.id)}>{unidad.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Costo unitario" id="costo_unitario" required>
					<input
						class="remove-arrow input"
						min="0"
						step="0.01"
						{...crearInsumo.fields.costo_unitario.as('number')}
					/>
				</FormFieldWrapper>
			</div>
		</form>
	{:else if modal === 'excel'}
		<div class="flex flex-col gap-4">
			<p class="text-sm text-base-content/70">
				Columnas requeridas: código, descripción, tipo, unidad y costo unitario. El código actualiza
				un insumo existente.
			</p>
			<div class="flex flex-wrap items-end gap-3">
				<input
					type="file"
					accept=".xlsx,.xls"
					class="file-input"
					onchange={(event) => (archivo = event.currentTarget.files?.[0])}
				/>
				<button class="btn btn-outline" onclick={analizarExcel} disabled={importando}>
					{importando ? 'Analizando...' : 'Analizar Excel'}
				</button>
			</div>
		</div>

		{#if erroresImportacion.length}
			<div role="alert" class="alert alert-error">
				<div>
					{#each erroresImportacion as error (error)}<p>{error}</p>{/each}
				</div>
			</div>
		{/if}
		{#if filasImportacion.length}
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead
						><tr><th>Código</th><th>Descripción</th><th>Tipo</th><th>Unidad</th><th>Costo</th></tr
						></thead
					>
					<tbody>
						{#each filasImportacion.slice(0, 10) as fila (fila.codigo)}
							<tr
								><td>{fila.codigo}</td><td>{fila.nombre}</td><td>{fila.tipo}</td><td
									>{fila.unidad}</td
								><td>${fila.costo_unitario.toLocaleString('es-AR')}</td></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="flex items-center justify-between gap-3">
				<span class="text-sm"
					>{filasImportacion.length} filas válidas. Se muestran las primeras 10.</span
				>
				<button class="btn btn-primary" onclick={confirmarImportacion}>Confirmar importación</button
				>
			</div>
		{/if}
	{/if}

	{#snippet actions()}
		{#if modal === 'crear'}
			<button class="btn" onclick={closeModal}>Cancelar</button>
			<button
				type="submit"
				class="btn btn-primary"
				form="insumo-form"
				disabled={!!crearInsumo.pending}
			>
				{crearInsumo.pending ? 'Guardando...' : 'Guardar insumo'}
			</button>
		{:else}
			<button class="btn" onclick={closeModal}>Cerrar</button>
		{/if}
	{/snippet}
</Modal>
