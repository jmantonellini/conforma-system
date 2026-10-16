<script lang="ts">
	import { SearchSelect } from '$lib/components/ui';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/types/cotizacion-editor';
	import { formatearDosDecimales } from '$lib/utils/precios';
	import { describeMaterialReceta, esMaterialSubproducto } from '$lib/utils/receta-producto';

	type Props = {
		linea: LineaEdicion;
		bloqueada: boolean;
		cantidadLineas: number;
		productos: ProductoOpcion[];
		insumos: InsumoOpcion[];
		onEliminar: (lineaId: number) => void;
		onSeleccionarProducto: (lineaId: number, productoId: string) => void;
		onSeleccionarInsumo: (lineaId: number, insumoId: string) => void;
		onActualizarCantidad: (lineaId: number, cantidad: number) => void;
		onActualizarDescripcion: (lineaId: number, descripcion: string) => void;
		onActualizarPrecio: (lineaId: number, precio: string) => void;
		onCambiarVisibilidad: (lineaId: number, visible: boolean) => void;
		onActualizarCostoInterno: (lineaId: number, costo: number) => void;
	};

	let {
		linea,
		bloqueada,
		cantidadLineas,
		productos,
		insumos,
		onEliminar,
		onSeleccionarProducto,
		onSeleccionarInsumo,
		onActualizarCantidad,
		onActualizarDescripcion,
		onActualizarPrecio,
		onCambiarVisibilidad,
		onActualizarCostoInterno
	}: Props = $props();
</script>

<tr
	class={[
		'relative z-0 border-x-2 border-y-2 focus-within:z-50 focus-within:opacity-100',
		{ 'border-success': linea.visible_cliente, 'border-warning': !linea.visible_cliente }
	]}
>
	<td class="relative min-w-72 focus-within:z-50">
		{#if linea.tipo === 'producto'}
			<SearchSelect
				label=""
				id={`producto-${linea.idx}`}
				placeholder="Buscar producto..."
				disabled={bloqueada}
				field={{
					value: () => linea.producto_id
				}}
				options={productos.map((producto) => ({
					value: String(producto.id),
					label: producto.nombre
				}))}
				onChange={(value: string) => onSeleccionarProducto(linea.idx, value)}
			/>
		{:else if linea.tipo === 'insumo'}
			<SearchSelect
				label=""
				id={`insumo-${linea.idx}`}
				placeholder="Buscar insumo interno..."
				disabled={bloqueada}
				field={{
					value: () => String(linea.insumo_id ?? '')
				}}
				options={insumos.map((insumo) => ({
					value: String(insumo.id),
					label: `${insumo.codigo} - ${insumo.nombre}`
				}))}
				onChange={(value: string) => onSeleccionarInsumo(linea.idx, value)}
			/>
		{:else if linea.nuevo_insumo}
			<div class="flex min-h-8 flex-col justify-center">
				<span class="font-medium">{linea.nuevo_insumo.nombre}</span>
				<span class="text-xs text-base-content/60">Nuevo insumo · {linea.nuevo_insumo.unidad}</span>
			</div>
		{:else}
			<input
				class="input w-full input-sm"
				required
				disabled={bloqueada}
				value={linea.descripcion}
				placeholder={linea.visible_cliente
					? 'Trabajo o concepto para el cliente'
					: 'Concepto interno'}
				oninput={(event) => onActualizarDescripcion(linea.idx, event.currentTarget.value)}
			/>
		{/if}
	</td>
	<td>
		<div class="flex items-center gap-1">
			<input
				class="remove-arrow input w-20 text-right input-sm"
				type="number"
				min="1"
				disabled={bloqueada}
				value={linea.cantidad}
				aria-label="Cantidad"
				oninput={(event) => onActualizarCantidad(linea.idx, Number(event.currentTarget.value) || 1)}
			/>
			{#if linea.unidad}<span class="text-xs text-base-content/60">{linea.unidad}</span>{/if}
		</div>
	</td>
	<td class="text-right">
		{#if !linea.visible_cliente}
			<input
				class="remove-arrow input w-32 text-right input-sm"
				type="number"
				min="0"
				step="0.01"
				disabled={bloqueada}
				value={linea.costo_materiales}
				aria-label="Costo unitario interno"
				oninput={(event) =>
					onActualizarCostoInterno(linea.idx, Number(event.currentTarget.value) || 0)}
			/>
		{:else}
			<input
				class="remove-arrow input w-32 text-right input-sm"
				type="number"
				min={linea.precio_minimo_unitario}
				step="0.01"
				disabled={bloqueada}
				value={linea.precio_lista_unitario}
				aria-label="Precio unitario"
				oninput={(event) => onActualizarPrecio(linea.idx, event.currentTarget.value)}
			/>
		{/if}
	</td>
	<td class="text-right font-semibold">
		${formatearDosDecimales(
			(linea.visible_cliente ? linea.precio_unitario : linea.costo_materiales) * linea.cantidad
		)}
	</td>
	<td>
		<input
			class="toggle toggle-success toggle-xs"
			type="checkbox"
			checked={linea.visible_cliente}
			disabled={bloqueada}
			aria-label={linea.visible_cliente ? 'Visible para el cliente' : 'Solo interno'}
			onchange={(event) => onCambiarVisibilidad(linea.idx, event.currentTarget.checked)}
		/>
	</td>
	<td>
		<button
			type="button"
			class="btn btn-square btn-ghost btn-xs"
			disabled={bloqueada || cantidadLineas === 1}
			title="Quitar línea"
			onclick={() => onEliminar(linea.idx)}>✕</button
		>
	</td>
</tr>

{#if Array.isArray(linea.insumos_snapshot) && linea.insumos_snapshot.length > 0}
	<tr class="border-x-2 border-b-2 border-base-300/80">
		<td colspan="6" class="p-0">
			<details class="collapse-arrow collapse w-full rounded-none bg-base-200/40">
				<summary class="collapse-title w-full px-3 py-2 text-xs font-medium text-base-content/80">
					Receta del producto
				</summary>
				<ul class="collapse-content flex w-full flex-col gap-1 px-3 pb-3 text-xs">
					{#each linea.insumos_snapshot as material, index (`${material.insumo_id ?? material.producto_id ?? 'subproducto'}-${index}`)}
						<li class="flex w-full items-center justify-between gap-3">
							<span>{describeMaterialReceta(material)}</span>
							{#if esMaterialSubproducto(material)}
								<span class="text-base-content/60">subproducto</span>
							{:else}
								<span>${formatearDosDecimales(material.subtotal)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		</td>
	</tr>
{/if}
