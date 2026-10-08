<script lang="ts">
	import { Can, FormFieldWrapper, SearchSelect } from '$lib/components/ui';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/types/cotizacion-editor';

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
		onActualizarDescuento: (lineaId: number, descuento: string) => void;
		onActualizarMotivo: (lineaId: number, motivo: string) => void;
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
		onActualizarDescuento,
		onActualizarMotivo
	}: Props = $props();
</script>

<tr class="focus-within:opacity-100" class:opacity-70={linea.tipo === 'insumo'}>
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
			<div class="flex flex-col gap-1">
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
				<span class="badge w-fit badge-ghost badge-xs">
					Costo interno · no se incluye en el PDF ni en el total de venta
				</span>
			</div>
		{:else}
			<input
				class="input w-full input-sm"
				required
				disabled={bloqueada}
				value={linea.descripcion}
				placeholder="Descripción para el cliente"
				oninput={(event) => onActualizarDescripcion(linea.idx, event.currentTarget.value)}
			/>
		{/if}
	</td>
	<td>
		<div class="flex items-center justify-end gap-1">
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
		{#if linea.tipo === 'insumo'}
			<span class="font-medium">
				${linea.costo_materiales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
			</span>
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
	<td class="text-right">
		{#if linea.tipo !== 'insumo'}
			<Can modulo="cotizaciones" accion="descuento">
				<input
					class="remove-arrow input w-20 text-right input-sm"
					type="number"
					min="0"
					max="99.99"
					step="0.01"
					disabled={bloqueada}
					value={linea.descuento_porcentaje}
					aria-label="Descuento porcentual"
					oninput={(event) => onActualizarDescuento(linea.idx, event.currentTarget.value)}
				/>
			</Can>
		{/if}
	</td>
	<td class="text-right font-semibold">
		${(
			(linea.tipo === 'insumo' ? linea.costo_materiales : linea.precio_unitario) * linea.cantidad
		).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
{#if linea.descuento_porcentaje > 0 && linea.tipo !== 'insumo'}
	<tr>
		<td colspan="6" class="bg-base-200/50">
			<Can modulo="cotizaciones" accion="descuento">
				<FormFieldWrapper label="Motivo del descuento" id={`motivo-${linea.idx}`} required>
					<input
						class="input w-full input-sm"
						required
						disabled={bloqueada}
						value={linea.justificacion_descuento}
						oninput={(event) => onActualizarMotivo(linea.idx, event.currentTarget.value)}
					/>
				</FormFieldWrapper>
			</Can>
		</td>
	</tr>
{/if}
{#if linea.tipo === 'producto' && linea.insumos_snapshot.length > 0}
	<tr>
		<td colspan="6" class="bg-base-200/50">
			<details class="collapse-arrow collapse p-0 text-sm">
				<summary class="collapse-title min-h-8 py-1 ps-8">Receta del producto</summary>
				<ul class="collapse-content flex flex-col gap-1">
					{#each linea.insumos_snapshot as material, index (`${material.insumo_id ?? material.producto_id ?? 'subproducto'}-${index}`)}
						<li class="flex justify-between gap-3">
							<span>
								{#if material.producto_id}
									{material.cantidad} x · {material.nombre}
								{:else}
									{material.cantidad} {material.unidad ?? ''} · {material.nombre}
								{/if}
							</span>
							{#if material.producto_id}
								<span class="text-base-content/60">subproducto</span>
							{:else}
								<span
									>${(material.subtotal ?? 0).toLocaleString('es-AR', {
										minimumFractionDigits: 2
									})}</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		</td>
	</tr>
{/if}
