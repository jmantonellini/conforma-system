<script lang="ts">
	import { Can, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import { Edit, Delete } from '$lib/components/ui/icons';
	import {
		actualizarCategoriaProducto,
		actualizarEstadoFabricacion,
		actualizarEstadoCotizacionAdmin,
		actualizarEstadoPedidoAdmin,
		crearCategoriaProducto,
		crearEstadoCotizacionAdmin,
		crearEstadoFabricacion,
		crearEstadoPedidoAdmin,
		eliminarCategoriaProducto,
		eliminarEstadoCotizacionAdmin,
		eliminarEstadoFabricacion,
		eliminarEstadoPedidoAdmin,
		crearTransicionEstadoAdmin,
		eliminarTransicionEstadoAdmin,
		getCategoriasProductoAdmin,
		getEstadosCotizacionAdmin,
		getEstadosFabricacionAdmin,
		getEstadosPedidoAdmin,
		getTransicionesEstadoAdmin
	} from '$lib/remote/configuracion.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';

	type Section = 'categorias' | 'fabricacion' | 'pedidos' | 'cotizaciones';
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
	let vistaEstado = $state<'estados' | 'transiciones'>('estados');
	let modalTransicionAbierto = $state(false);
	let estadoOrigenId = $state('');
	let estadoDestinoId = $state('');

	let categorias = $derived(await getCategoriasProductoAdmin());
	let estadosFabricacion = $derived(await getEstadosFabricacionAdmin());
	let estadosPedido = $derived(await getEstadosPedidoAdmin());
	let estadosCotizacion = $derived(await getEstadosCotizacionAdmin());
	let transicionesFabricacion = $derived(await getTransicionesEstadoAdmin('fabricacion'));
	let transicionesPedido = $derived(await getTransicionesEstadoAdmin('pedido'));
	let transicionesCotizacion = $derived(await getTransicionesEstadoAdmin('cotizacion'));
	let estadosSeleccionados = $derived(
		activeSection === 'fabricacion'
			? estadosFabricacion
			: activeSection === 'pedidos'
				? estadosPedido
				: estadosCotizacion
	);
	let transicionesSeleccionadas = $derived(
		activeSection === 'fabricacion'
			? transicionesFabricacion
			: activeSection === 'pedidos'
				? transicionesPedido
				: transicionesCotizacion
	);
	let tipoEstadoActual = $derived<'fabricacion' | 'pedido' | 'cotizacion'>(
		activeSection === 'fabricacion'
			? 'fabricacion'
			: activeSection === 'pedidos'
				? 'pedido'
				: 'cotizacion'
	);

	$effect(() => {
		const section = page.url.searchParams.get('seccion');
		if (
			section === 'fabricacion' ||
			section === 'pedidos' ||
			section === 'cotizaciones' ||
			section === 'categorias'
		) {
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
			} else if (modalType === 'cotizaciones') {
				const data = { nombre, slug, grupo, orden: Number(orden), color, es_final: esFinal };
				if (editingId) await actualizarEstadoCotizacionAdmin({ id: editingId, ...data });
				else await crearEstadoCotizacionAdmin(data);
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
			if (tipo === 'cotizaciones') await eliminarEstadoCotizacionAdmin({ id });
			toast.success('Registro eliminado');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
		}
	}

	function abrirNuevaTransicion() {
		estadoOrigenId = '';
		estadoDestinoId = '';
		modalTransicionAbierto = true;
	}

	function cerrarModalTransicion() {
		modalTransicionAbierto = false;
		estadoOrigenId = '';
		estadoDestinoId = '';
	}

	async function guardarTransicion() {
		if (!estadoOrigenId || !estadoDestinoId || estadoOrigenId === estadoDestinoId) return;
		try {
			await crearTransicionEstadoAdmin({
				tipo: tipoEstadoActual,
				estado_origen_id: Number(estadoOrigenId),
				estado_destino_id: Number(estadoDestinoId)
			});
			toast.success('Transición creada');
			cerrarModalTransicion();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo crear la transición');
		}
	}

	async function eliminarTransicion(id: number) {
		if (!confirm('¿Eliminar esta transición?')) return;
		try {
			await eliminarTransicionEstadoAdmin({ id, tipo: tipoEstadoActual });
			toast.success('Transición eliminada');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la transición');
		}
	}

	function nombreEstado(id: number) {
		return estadosSeleccionados.find((estado) => estado.id === id)?.nombre ?? `Estado ${id}`;
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
			<button
				class:tab-active={activeSection === 'cotizaciones'}
				class="tab"
				onclick={() => (activeSection = 'cotizaciones')}>Estados de cotización</button
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
			{@const estados =
				activeSection === 'fabricacion'
					? estadosFabricacion
					: activeSection === 'pedidos'
						? estadosPedido
						: estadosCotizacion}
			<div role="tablist" class="tabs-box tabs w-fit">
				<button
					class:tab-active={vistaEstado === 'estados'}
					class="tab"
					onclick={() => (vistaEstado = 'estados')}>Estados</button
				>
				<button
					class:tab-active={vistaEstado === 'transiciones'}
					class="tab"
					onclick={() => (vistaEstado = 'transiciones')}>Transiciones</button
				>
			</div>
			<div class="card bg-base-100 shadow">
				<div class="card-body p-0">
					<div class="flex items-center justify-between p-6">
						<h2 class="card-title">
							{#if vistaEstado === 'transiciones'}
								Transiciones
							{:else if activeSection === 'fabricacion'}
								Estados de fabricación
							{:else if activeSection === 'pedidos'}
								Estados de pedidos
							{:else}
								Estados de cotización
							{/if}
						</h2>
						<Can modulo="configuracion" accion="edit">
							{#if vistaEstado === 'transiciones'}
								<button class="btn btn-primary btn-sm" onclick={abrirNuevaTransicion}>
									+ Nueva transición
								</button>
							{:else}
								<button class="btn btn-primary btn-sm" onclick={() => abrirNuevo(activeSection)}>
									+ Nuevo estado
								</button>
							{/if}
						</Can>
					</div>
					{#if vistaEstado === 'estados'}
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
					{:else}
						{#snippet transitionHeader()}<th>Desde</th><th>Hacia</th><th class="text-center"
								>Acciones</th
							>{/snippet}
						{#snippet transitionRow(item: (typeof transicionesSeleccionadas)[number])}
							<td class="font-medium">{nombreEstado(item.estado_origen_id)}</td>
							<td class="font-medium">{nombreEstado(item.estado_destino_id)}</td>
							<td class="text-center">
								<Can modulo="configuracion" accion="edit">
									<button
										class="btn btn-circle btn-ghost text-error btn-sm"
										title="Eliminar transición"
										onclick={() => eliminarTransicion(item.id)}><Delete /></button
									>
								</Can>
							</td>
						{/snippet}
						<Table
							data={transicionesSeleccionadas}
							header={transitionHeader}
							row={transitionRow}
							emptyMessage="No hay transiciones configuradas"
						/>
					{/if}
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

<Modal open={modalTransicionAbierto} title="Nueva transición" onClose={cerrarModalTransicion}>
	<div class="grid gap-4 py-2">
		<FormFieldWrapper label="Desde" id="estado-origen" required>
			<select class="select w-full" bind:value={estadoOrigenId}>
				<option value="">Seleccionar estado</option>
				{#each estadosSeleccionados as estado (estado.id)}
					<option value={String(estado.id)}>{estado.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper label="Hacia" id="estado-destino" required>
			<select class="select w-full" bind:value={estadoDestinoId}>
				<option value="">Seleccionar estado</option>
				{#each estadosSeleccionados as estado (estado.id)}
					<option value={String(estado.id)}>{estado.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
	</div>
	{#snippet actions()}
		<button class="btn" onclick={cerrarModalTransicion}>Cancelar</button>
		<Can modulo="configuracion" accion="edit">
			<button
				class="btn btn-primary"
				disabled={!estadoOrigenId || !estadoDestinoId || estadoOrigenId === estadoDestinoId}
				onclick={guardarTransicion}
			>
				Guardar
			</button>
		</Can>
	{/snippet}
</Modal>
