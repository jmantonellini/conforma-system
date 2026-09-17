<script lang="ts">
	import { Can, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import { Edit, Delete } from '$lib/components/ui/icons';
	import {
		actualizarCategoriaProducto,
		actualizarEstadoFabricacion,
		actualizarEstadoPedidoAdmin,
		crearCategoriaProducto,
		crearEstadoFabricacion,
		crearEstadoPedidoAdmin,
		eliminarCategoriaProducto,
		eliminarEstadoFabricacion,
		eliminarEstadoPedidoAdmin,
		getCategoriasProductoAdmin,
		getEstadosFabricacionAdmin,
		getEstadosPedidoAdmin
	} from '$lib/remote/configuracion.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';

	type Section = 'categorias' | 'fabricacion' | 'pedidos';
	type ModalType = Section | null;

	let activeSection = $state<Section>('categorias');
	let modalType = $state<ModalType>(null);
	let editingId = $state<number | null>(null);
	let nombre = $state('');
	let descripcion = $state('');
	let slug = $state('');
	let grupo = $state('proceso');
	let orden = $state(1);
	let color = $state('info');
	let esFinal = $state(false);

	let categorias = $derived(await getCategoriasProductoAdmin());
	let estadosFabricacion = $derived(await getEstadosFabricacionAdmin());
	let estadosPedido = $derived(await getEstadosPedidoAdmin());

	$effect(() => {
		const section = page.url.searchParams.get('seccion');
		if (section === 'fabricacion' || section === 'pedidos' || section === 'categorias') {
			activeSection = section;
		}
	});

	function abrirNuevo(tipo: Exclude<Section, 'categorias'> | 'categorias') {
		modalType = tipo;
		editingId = null;
		nombre = '';
		descripcion = '';
		slug = '';
		grupo = 'proceso';
		orden = 1;
		color = 'info';
		esFinal = false;
	}

	function abrirEditar(tipo: Section, item: any) {
		modalType = tipo;
		editingId = item.id;
		nombre = item.nombre;
		descripcion = item.descripcion ?? '';
		slug = item.slug ?? '';
		grupo = item.grupo ?? 'proceso';
		orden = item.orden ?? 1;
		color = item.color ?? 'info';
		esFinal = item.es_final ?? false;
	}

	function cerrarModal() {
		modalType = null;
		editingId = null;
	}

	async function guardar() {
		try {
			if (modalType === 'categorias') {
				const data = { nombre, descripcion: descripcion || undefined };
				if (editingId) await actualizarCategoriaProducto({ id: editingId, ...data });
				else await crearCategoriaProducto(data);
			} else if (modalType === 'fabricacion') {
				const data = { nombre, slug, grupo, orden: Number(orden), color, es_final: esFinal };
				if (editingId) await actualizarEstadoFabricacion({ id: editingId, ...data });
				else await crearEstadoFabricacion(data);
			} else if (modalType === 'pedidos') {
				const data = { nombre, slug, grupo, orden: Number(orden), color, es_final: esFinal };
				if (editingId) await actualizarEstadoPedidoAdmin({ id: editingId, ...data });
				else await crearEstadoPedidoAdmin(data);
			}
			toast.success(editingId ? 'Configuración actualizada' : 'Configuración creada');
			cerrarModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
		}
	}

	async function eliminar(tipo: Section, id: number) {
		if (!confirm('¿Eliminar este registro?')) return;
		try {
			if (tipo === 'categorias') await eliminarCategoriaProducto({ id });
			if (tipo === 'fabricacion') await eliminarEstadoFabricacion({ id });
			if (tipo === 'pedidos') await eliminarEstadoPedidoAdmin({ id });
			toast.success('Registro eliminado');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
		}
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-6">
		<div>
			<h1 class="text-2xl font-bold">Configuración de catálogos</h1>
			<p class="mt-1 text-sm text-base-content/60">
				Administrá categorías y estados usados por el ERP.
			</p>
		</div>

		<div role="tablist" class="tabs-box tabs w-fit">
			<button
				class:tab-active={activeSection === 'categorias'}
				class="tab"
				onclick={() => (activeSection = 'categorias')}>Categorías de productos</button
			>
			<button
				class:tab-active={activeSection === 'fabricacion'}
				class="tab"
				onclick={() => (activeSection = 'fabricacion')}>Estados de fabricación</button
			>
			<button
				class:tab-active={activeSection === 'pedidos'}
				class="tab"
				onclick={() => (activeSection = 'pedidos')}>Estados de pedidos</button
			>
		</div>

		{#if activeSection === 'categorias'}
			<div class="card bg-base-100 shadow">
				<div class="card-body p-0">
					<div class="flex items-center justify-between p-6">
						<h2 class="card-title">Categorías de productos</h2>
						<Can modulo="configuracion" accion="edit"
							><button class="btn btn-primary btn-sm" onclick={() => abrirNuevo('categorias')}
								>+ Nueva categoría</button
							></Can
						>
					</div>
					{#snippet categoryHeader()}<th>Nombre</th><th>Descripción</th><th class="text-center"
							>Acciones</th
						>{/snippet}
					{#snippet categoryRow(item: (typeof categorias)[number])}
						<td class="font-medium">{item.nombre}</td><td>{item.descripcion || '-'}</td>
						<td class="text-center"
							><Can modulo="configuracion" accion="edit"
								><button
									class="btn btn-circle btn-ghost btn-sm"
									onclick={() => abrirEditar('categorias', item)}><Edit /></button
								></Can
							><Can modulo="configuracion" accion="edit"
								><button
									class="btn btn-circle btn-ghost text-error btn-sm"
									onclick={() => eliminar('categorias', item.id)}><Delete /></button
								></Can
							></td
						>
					{/snippet}
					<Table
						data={categorias}
						header={categoryHeader}
						row={categoryRow}
						emptyMessage="No hay categorías creadas"
					/>
				</div>
			</div>
		{:else}
			{@const estados = activeSection === 'fabricacion' ? estadosFabricacion : estadosPedido}
			<div class="card bg-base-100 shadow">
				<div class="card-body p-0">
					<div class="flex items-center justify-between p-6">
						<h2 class="card-title">
							{activeSection === 'fabricacion' ? 'Estados de fabricación' : 'Estados de pedidos'}
						</h2>
						<Can modulo="configuracion" accion="edit"
							><button class="btn btn-primary btn-sm" onclick={() => abrirNuevo(activeSection)}
								>+ Nuevo estado</button
							></Can
						>
					</div>
					{#snippet stateHeader()}<th>Orden</th><th>Nombre</th><th>Slug</th><th>Grupo</th><th
							>Color</th
						><th>Final</th><th class="text-center">Acciones</th>{/snippet}
					{#snippet stateRow(item: (typeof estados)[number])}
						<td>{item.orden}</td><td class="font-medium">{item.nombre}</td><td
							class="font-mono text-sm">{item.slug}</td
						><td>{item.grupo}</td><td
							><span class="badge badge-{item.color || 'ghost'}">{item.color || 'sin color'}</span
							></td
						><td>{item.es_final ? 'Sí' : 'No'}</td><td class="text-center"
							><Can modulo="configuracion" accion="edit"
								><button
									class="btn btn-circle btn-ghost btn-sm"
									onclick={() => abrirEditar(activeSection, item)}><Edit /></button
								><button
									class="btn btn-circle btn-ghost text-error btn-sm"
									onclick={() => eliminar(activeSection, item.id)}><Delete /></button
								></Can
							></td
						>
					{/snippet}
					<Table
						data={estados}
						header={stateHeader}
						row={stateRow}
						emptyMessage="No hay estados creados"
					/>
				</div>
			</div>
		{/if}
	</div>
</PageLayout>

<Modal
	open={modalType !== null}
	title={editingId ? 'Editar configuración' : 'Nueva configuración'}
	onClose={cerrarModal}
>
	<form
		id="configuracion-form"
		onsubmit={(event) => {
			event.preventDefault();
			guardar();
		}}
	>
		<div class="grid gap-4">
			<FormFieldWrapper label="Nombre" id="nombre" required
				><input class="input" bind:value={nombre} /></FormFieldWrapper
			>
			{#if modalType === 'categorias'}
				<FormFieldWrapper label="Descripción" id="descripcion"
					><textarea class="textarea" bind:value={descripcion}></textarea></FormFieldWrapper
				>
			{:else}
				<FormFieldWrapper label="Slug" id="slug" required
					><input class="input" bind:value={slug} /></FormFieldWrapper
				>
				<div class="grid gap-4 sm:grid-cols-2">
					<FormFieldWrapper label="Grupo" id="grupo" required
						><input class="input" bind:value={grupo} /></FormFieldWrapper
					><FormFieldWrapper label="Orden" id="orden" required
						><input class="input" type="number" min="0" bind:value={orden} /></FormFieldWrapper
					>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<FormFieldWrapper label="Color" id="color"
						><input class="input" bind:value={color} /></FormFieldWrapper
					><label class="label gap-2"
						><input type="checkbox" class="checkbox" bind:checked={esFinal} /> Estado final</label
					>
				</div>
			{/if}
		</div>
	</form>
	{#snippet actions()}<button class="btn" onclick={cerrarModal}>Cancelar</button><Can
			modulo="configuracion"
			accion="edit"
			><button class="btn btn-primary" type="submit" form="configuracion-form">Guardar</button></Can
		>{/snippet}
</Modal>
