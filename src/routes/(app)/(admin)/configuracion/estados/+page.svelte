<script lang="ts">
	import { confirmarYEjecutar } from '$lib/stores/confirmacion.svelte';
	import { Can, FormFieldWrapper, Modal, PageLayout, Table } from '$lib/components/ui';
	import { Edit, Delete } from '$lib/components/ui/icons';
	import { OPCIONES_COLOR, claseBadge } from '$lib/components/ui/colores';
	import {
		actualizarCategoriaProducto,
		crearCategoriaProducto,
		crearTransicionEstadoAdmin,
		eliminarCategoriaProducto,
		eliminarEstado,
		eliminarTransicionEstadoAdmin,
		getCategoriasProductoAdmin,
		getEstadosAdmin,
		getTransicionesEstadoAdmin,
		guardarEstado
	} from '$lib/remote/configuracion.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { page } from '$app/state';

	type Flujo = 'fabricacion' | 'pedido' | 'cotizacion';
	type Section = 'categorias' | Flujo;

	const SECCIONES: Record<Section, string> = {
		categorias: 'Categorías de productos',
		fabricacion: 'Estados de fabricación',
		pedido: 'Estados de pedidos',
		cotizacion: 'Estados de cotización'
	};

	const seccionInicial = page.url.searchParams.get('seccion');
	let activeSection = $state<Section>(
		seccionInicial && seccionInicial in SECCIONES ? (seccionInicial as Section) : 'categorias'
	);
	let modalType = $state<Section | null>(null);
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

	const flujo = $derived<Flujo>(activeSection === 'categorias' ? 'fabricacion' : activeSection);
	const categorias = $derived(await getCategoriasProductoAdmin());
	const estadosSeleccionados = $derived(await getEstadosAdmin(flujo));
	const transicionesSeleccionadas = $derived(await getTransicionesEstadoAdmin(flujo));
	const esCategorias = $derived(activeSection === 'categorias');
	const esVistaEstados = $derived(vistaEstado === 'estados');
	const esCategoriasModal = $derived(modalType === 'categorias');

	function abrirNuevo(tipo: Section) {
		abrirEditar(tipo, { id: null, nombre: '' });
	}

	function abrirEditar(
		tipo: Section,
		item: {
			id: number | null;
			nombre: string;
			descripcion?: string | null;
			slug?: string;
			grupo?: string;
			orden?: number;
			color?: string | null;
			es_final?: boolean;
		}
	) {
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
		if (!modalType) return;
		try {
			if (modalType === 'categorias') {
				const data = { nombre, descripcion: descripcion || undefined };
				if (editingId) await actualizarCategoriaProducto({ id: editingId, ...data });
				else if (!(await crearCategoriaProducto(data)).creada) {
					toast.warning('Ya existe una categoría con ese nombre');
					return;
				}
			} else {
				await guardarEstado({
					id: editingId ?? undefined,
					flujo: modalType,
					nombre,
					slug,
					grupo,
					orden: Number(orden),
					color,
					es_final: esFinal
				});
			}
			toast.success(editingId ? 'Configuración actualizada' : 'Configuración creada');
			cerrarModal();
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo guardar'));
		}
	}

	const eliminar = (tipo: Section, id: number) =>
		confirmarYEjecutar({
			mensaje: '¿Eliminar este registro?',
			ejecutar: () =>
				tipo === 'categorias' ? eliminarCategoriaProducto({ id }) : eliminarEstado({ id }),
			exito: 'Registro eliminado'
		});

	function abrirNuevaTransicion() {
		estadoOrigenId = '';
		estadoDestinoId = '';
		modalTransicionAbierto = true;
	}

	async function guardarTransicion() {
		if (!estadoOrigenId || !estadoDestinoId || estadoOrigenId === estadoDestinoId) return;
		try {
			await crearTransicionEstadoAdmin({
				estado_origen_id: Number(estadoOrigenId),
				estado_destino_id: Number(estadoDestinoId)
			});
			toast.success('Transición creada');
			modalTransicionAbierto = false;
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo crear la transición'));
		}
	}

	const eliminarTransicion = (id: number) =>
		confirmarYEjecutar({
			mensaje: '¿Eliminar esta transición?',
			ejecutar: () => eliminarTransicionEstadoAdmin({ id, flujo }),
			exito: 'Transición eliminada'
		});

	function nombreEstado(id: number) {
		return estadosSeleccionados.find((estado) => estado.id === id)?.nombre ?? `Estado ${id}`;
	}
</script>

<PageLayout>
	<div class="flex flex-col gap-6">
		<div role="tablist" class="tabs-box tabs w-fit">
			{#each Object.entries(SECCIONES) as [seccion, etiqueta] (seccion)}
				<button
					class={['tab', { 'tab-active': activeSection === seccion }]}
					onclick={() => (activeSection = seccion as Section)}>{etiqueta}</button
				>
			{/each}
		</div>

		{#if esCategorias}
			<div class="card">
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
			<div role="tablist" class="tabs-box tabs w-fit">
				<button
					class={['tab', { 'tab-active': esVistaEstados }]}
					onclick={() => (vistaEstado = 'estados')}>Estados</button
				>
				<button
					class={['tab', { 'tab-active': !esVistaEstados }]}
					onclick={() => (vistaEstado = 'transiciones')}>Transiciones</button
				>
			</div>
			<div class="card">
				<div class="card-body p-0">
					<div class="flex items-center justify-between p-6">
						<h2 class="card-title">
							{esVistaEstados ? SECCIONES[activeSection] : 'Transiciones'}
						</h2>
						<Can modulo="configuracion" accion="edit">
							{#if !esVistaEstados}
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
					{#if esVistaEstados}
						{#snippet stateHeader()}<th>Orden</th><th>Nombre</th><th>Slug</th><th>Grupo</th><th
								>Color</th
							><th>Final</th><th class="text-center">Acciones</th>{/snippet}
						{#snippet stateRow(item: (typeof estadosSeleccionados)[number])}
							<td>{item.orden}</td><td class="font-medium">{item.nombre}</td><td
								class="font-mono text-sm">{item.slug}</td
							><td>{item.grupo}</td><td
								><span class={['badge badge-sm', claseBadge(item.color)]}
									>{OPCIONES_COLOR.find((o) => o.valor === item.color)?.nombre ??
										item.color ??
										'Sin color'}</span
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
							data={estadosSeleccionados}
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
	titulo={editingId ? 'Editar configuración' : 'Nueva configuración'}
	alCerrar={cerrarModal}
	accion={{ etiqueta: 'Guardar', form: 'configuracion-form' }}
>
	<form
		id="configuracion-form"
		onsubmit={(event) => {
			event.preventDefault();
			guardar();
		}}
	>
		<FormFieldWrapper label="Nombre" id="nombre" required>
			<input id="nombre" class="input" bind:value={nombre} />
		</FormFieldWrapper>
		{#if esCategoriasModal}
			<FormFieldWrapper label="Descripción" id="descripcion">
				<textarea id="descripcion" class="textarea" rows="3" bind:value={descripcion}></textarea>
			</FormFieldWrapper>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2">
				<FormFieldWrapper
					label="Slug"
					id="slug"
					required
					ayuda="Identificador interno, sin espacios."
				>
					<input id="slug" class="input font-mono" bind:value={slug} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Grupo" id="grupo" required>
					<input id="grupo" class="input" bind:value={grupo} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Orden" id="orden" required>
					<input id="orden" class="input" type="number" min="0" bind:value={orden} />
				</FormFieldWrapper>
				<FormFieldWrapper label="Color" id="color">
					<select id="color" class="select" bind:value={color}>
						{#each OPCIONES_COLOR as opcion (opcion.valor)}
							<option value={opcion.valor}>{opcion.nombre}</option>
						{/each}
					</select>
				</FormFieldWrapper>
			</div>
			<label class="label gap-2 text-sm text-base-content">
				<input type="checkbox" class="checkbox checkbox-sm" bind:checked={esFinal} />
				Estado final (cierra el flujo)
			</label>
		{/if}
	</form>
</Modal>

<Modal
	bind:open={modalTransicionAbierto}
	ancho="sm"
	titulo="Nueva transición"
	accion={{
		etiqueta: 'Guardar',
		deshabilitada: !estadoOrigenId || !estadoDestinoId || estadoOrigenId === estadoDestinoId,
		onclick: guardarTransicion
	}}
>
	<FormFieldWrapper label="Desde" id="estado-origen" required>
		<select id="estado-origen" class="select" bind:value={estadoOrigenId}>
			<option value="">Seleccionar estado</option>
			{#each estadosSeleccionados as estado (estado.id)}
				<option value={String(estado.id)}>{estado.nombre}</option>
			{/each}
		</select>
	</FormFieldWrapper>
	<FormFieldWrapper label="Hacia" id="estado-destino" required>
		<select id="estado-destino" class="select" bind:value={estadoDestinoId}>
			<option value="">Seleccionar estado</option>
			{#each estadosSeleccionados as estado (estado.id)}
				<option value={String(estado.id)}>{estado.nombre}</option>
			{/each}
		</select>
	</FormFieldWrapper>
</Modal>
