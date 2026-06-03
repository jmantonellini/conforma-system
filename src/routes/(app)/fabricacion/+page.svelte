<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { ordenFabricacion, lineasPedido, progreso } = data;

	const porcentaje = (ordenFabricacion.cantidad_producida / ordenFabricacion.cantidad_total) * 100;
</script>

<div class="card">
	<h2>Orden de Fabricación #{ordenFabricacion.numero_lote}</h2>

	<div class="progress-bar">
		<div class="progress" style="width: {porcentaje}%">
			{ordenFabricacion.cantidad_producida} / {ordenFabricacion.cantidad_total}
		</div>
	</div>

	{#if ordenFabricacion.cantidad_total > 1}
		<button onclick={iniciarProduccionMasiva}>
			🏭 Iniciar producción de {ordenFabricacion.cantidad_total} unidades
		</button>
	{/if}

	<!-- Tracking individual (opcional) -->
	<details>
		<summary>Tracking por unidad ({ordenFabricacion.cantidad_total} escapes)</summary>
		<table>
			{#each unidades as unidad (unidad.numero_serie)}
				<tr>
					<td>Unidad #{unidad.numero_serie}</td>
					<td class:completed={unidad.estado === 'terminado'}>✓</td>
				</tr>
			{/each}
		</table>
	</details>
</div>
