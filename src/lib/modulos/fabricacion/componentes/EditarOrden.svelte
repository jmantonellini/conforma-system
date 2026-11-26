<script lang="ts">
	import { untrack } from 'svelte';
	import { FormFieldWrapper, SearchSelect, Seccion } from '$lib/ui';
	import type { Option } from '$lib/ui/SearchSelect.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { fechaInput } from '$lib/utils/fechas';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import { getProductosCatalogo } from '$lib/modulos/productos/productos.remote';
	import { editarOrdenFabricacion } from '../fabricacion.remote';
	import { ETIQUETA_PRIORIDAD } from '../tipos';

	type Orden = {
		id: number;
		nombre_trabajo: string;
		observaciones: string | null;
		prioridad: number | null;
		fecha_fin_estimada: Date | string | null;
		asignado_a: number | null;
		producto: { id: number; nombre: string; codigo: string } | null;
		producto_trabajo_id: number | null;
		motivo_producto_fijo: string | null;
		descripcion_producto: string | null;
	};

	let {
		orden,
		guardando = $bindable(false),
		onGuardado
	}: { orden: Orden; guardando?: boolean; onGuardado: () => void } = $props();

	const inicial = untrack(() => orden);
	let nombre = $state(inicial.nombre_trabajo);
	let observaciones = $state(inicial.observaciones ?? '');
	let prioridad = $state(String(inicial.prioridad ?? 0));
	let fecha = $state(inicial.fecha_fin_estimada ? fechaInput(inicial.fecha_fin_estimada) : '');
	let asignado = $state(inicial.asignado_a ? String(inicial.asignado_a) : '');
	let productoId = $state(inicial.producto_trabajo_id ? String(inicial.producto_trabajo_id) : '');
	let nombreProducto = $state(inicial.producto?.nombre ?? inicial.descripcion_producto ?? '');
	let resultados = $state<Option[]>([]);
	let solicitud = 0;

	const empleados = $derived(await getEmpleadosOpciones());
	const actual = $derived<Option[]>(
		orden.producto
			? [
					{
						value: String(orden.producto.id),
						label: orden.producto.nombre,
						detalle: orden.producto.codigo
					}
				]
			: []
	);
	const opciones = $derived([
		...actual,
		...resultados.filter((opcion) => !actual.some((item) => item.value === opcion.value))
	]);
	const cambiaProducto = $derived(productoId !== String(orden.producto_trabajo_id ?? ''));

	async function buscar(texto: string) {
		const numero = ++solicitud;
		const { data } = await getProductosCatalogo({ search: texto || undefined, limit: 30 });
		if (numero !== solicitud) return;
		resultados = data.map((producto) => ({
			value: String(producto.id),
			label: producto.nombre,
			detalle: [producto.codigo, producto.marca?.nombre, producto.modelo?.nombre]
				.filter(Boolean)
				.join(' · ')
		}));
	}

	function elegirProducto(valor: string) {
		const elegido = opciones.find((opcion) => opcion.value === valor);
		if (elegido && nombre.trim() === nombreProducto.trim()) nombre = elegido.label;
		if (elegido) nombreProducto = elegido.label;
		productoId = valor;
	}

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!nombre.trim()) return toast.error('Escribí el nombre del trabajo');
		guardando = true;
		try {
			const { cambios } = await editarOrdenFabricacion({
				id: orden.id,
				nombre_trabajo: nombre,
				observaciones: observaciones.trim() || null,
				prioridad: Number(prioridad) as 0 | 1 | 2,
				fecha_fin_estimada: fecha || null,
				asignado_a: asignado ? Number(asignado) : null,
				producto_id: cambiaProducto && productoId ? Number(productoId) : null
			});
			onGuardado();
			toast.success(cambios.length ? 'Orden actualizada' : 'No había cambios para guardar');
		} catch (causa) {
			toast.error(mensajeError(causa, 'No se pudo actualizar la orden'));
		} finally {
			guardando = false;
		}
	}
</script>

<Seccion titulo="Editar orden">
	<form id="editar-orden" class="flex flex-col gap-4" onsubmit={guardar}>
		<div>
			<SearchSelect
				id="editar-orden-producto"
				label="Producto"
				options={opciones}
				field={{ value: () => productoId }}
				placeholder="Buscá por nombre, código, marca o modelo..."
				allowClear={false}
				disabled={!!orden.motivo_producto_fijo}
				onSearch={buscar}
				onChange={elegirProducto}
			/>
			<p class="mt-1 text-sm text-base-content/60">
				{#if orden.motivo_producto_fijo}
					{orden.motivo_producto_fijo}: el producto ya no se puede cambiar.
				{:else if cambiaProducto}
					Se cambia en el pedido y se recalculan los insumos con la receta del producto nuevo. El
					precio no cambia.
				{:else}
					Define el vehículo, la categoría y la receta. Se puede cambiar mientras ninguna unidad
					haya pasado de "Preparando material".
				{/if}
			</p>
		</div>

		<FormFieldWrapper id="editar-orden-nombre" label="Nombre del trabajo" required>
			<input id="editar-orden-nombre" class="input w-full" bind:value={nombre} />
		</FormFieldWrapper>

		<FormFieldWrapper id="editar-orden-especificaciones" label="Especificaciones técnicas">
			<textarea
				id="editar-orden-especificaciones"
				class="textarea w-full"
				rows="5"
				placeholder="Medidas, materiales, terminación, lo que haya pasado el cliente..."
				bind:value={observaciones}></textarea>
		</FormFieldWrapper>

		<div class="grid gap-4 sm:grid-cols-2">
			<FormFieldWrapper id="editar-orden-prioridad" label="Prioridad">
				<select id="editar-orden-prioridad" class="select w-full" bind:value={prioridad}>
					{#each Object.entries(ETIQUETA_PRIORIDAD) as [valor, etiqueta] (valor)}
						<option value={valor}>{etiqueta.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>
			<FormFieldWrapper id="editar-orden-fecha" label="Entrega estimada">
				<input id="editar-orden-fecha" type="date" class="input w-full" bind:value={fecha} />
			</FormFieldWrapper>
		</div>

		<FormFieldWrapper id="editar-orden-asignado" label="Asignado a">
			<select id="editar-orden-asignado" class="select w-full" bind:value={asignado}>
				<option value="">Sin asignar</option>
				{#each empleados as empleado (empleado.id)}
					<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido}</option>
				{/each}
			</select>
		</FormFieldWrapper>
	</form>
</Seccion>
