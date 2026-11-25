<script lang="ts">
	import { resolve } from '$app/paths';
	import { EstadoBadge, Seccion } from '$lib/ui';
	import { formatearFecha } from '$lib/utils/fechas';
	import { formatearMoneda } from '$lib/utils/precios';
	import { getUnidadesFabricadas } from '../fabricacion-consultas.remote';

	let { productoId }: { productoId: number } = $props();

	const fabricados = $derived(await getUnidadesFabricadas({ producto_id: productoId, limit: 20 }));
	const ultima = $derived(fabricados.unidades[0]?.fecha ?? null);
	const conPrecios = $derived(fabricados.unidades.some((unidad) => unidad.precio_usd !== null));
</script>

<Seccion
	titulo="Fabricados"
	descripcion={fabricados.total
		? `${fabricados.total} ${fabricados.total === 1 ? 'unidad' : 'unidades'} · la última el ${formatearFecha(ultima)}`
		: undefined}
>
	{#if fabricados.unidades.length}
		<div class="-mx-4 overflow-x-auto sm:-mx-5">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>N° grabado</th>
						<th>Fecha</th>
						<th>Cliente</th>
						<th>OF</th>
						{#if conPrecios}<th class="text-right">Precio s/IVA</th>{/if}
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					{#each fabricados.unidades as unidad (unidad.id)}
						<tr>
							<td class="font-semibold tabular-nums">{unidad.numero ?? '—'}</td>
							<td class="text-base-content/70">{formatearFecha(unidad.fecha)}</td>
							<td>{unidad.cliente ?? '—'}</td>
							<td>
								{#if unidad.orden_id}
									<a
										class="link font-mono link-hover"
										href={resolve(`/fabricacion/${unidad.orden_id}`)}
									>
										OF-{unidad.orden_id}
									</a>
								{/if}
							</td>
							{#if conPrecios}
								<td class="text-right tabular-nums">
									{unidad.precio_usd === null ? '—' : formatearMoneda(unidad.precio_usd, 'USD')}
								</td>
							{/if}
							<td><EstadoBadge class="badge-sm" estado={unidad.estado} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if fabricados.total > fabricados.unidades.length}
			<p class="mt-2 text-sm text-base-content/60">
				Se muestran las últimas {fabricados.unidades.length}.
			</p>
		{/if}
	{:else}
		<p class="text-sm text-base-content/60">
			Todavía no se fabricó ninguna unidad de este producto.
		</p>
	{/if}
</Seccion>
