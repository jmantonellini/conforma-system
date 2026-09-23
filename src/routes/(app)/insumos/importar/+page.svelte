<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, PageLayout } from '$lib/components/ui';
	import { importarInsumos } from '$lib/remote/insumos.remote';
	import { toast } from '$lib/stores/toast.svelte';

	type ImportacionFila = {
		codigo: string;
		nombre: string;
		tipo: string;
		unidad: string;
		costo_unitario: number;
		flete_porcentaje: number;
		categoria?: string;
		proveedor?: string;
		observaciones?: string;
	};

	let archivo = $state<File | undefined>();
	let importando = $state(false);
	let filas = $state<ImportacionFila[]>([]);
	let errores = $state<string[]>([]);

	async function analizarExcel() {
		if (!archivo) {
			toast.error('Seleccioná un archivo Excel');
			return;
		}
		importando = true;
		filas = [];
		errores = [];
		try {
			const formData = new FormData();
			formData.set('archivo', archivo);
			const respuesta = await fetch('/insumos/importar', { method: 'POST', body: formData });
			const resultado = (await respuesta.json()) as {
				error?: string;
				errores?: string[];
				filas?: ImportacionFila[];
				cantidad?: number;
			};
			if (!respuesta.ok)
				throw new Error([resultado.error, ...(resultado.errores ?? [])].filter(Boolean).join('. '));
			filas = resultado.filas ?? [];
			toast.success(`${resultado.cantidad ?? 0} filas listas para importar`);
		} catch (error) {
			errores = [error instanceof Error ? error.message : 'No se pudo analizar el archivo'];
		} finally {
			importando = false;
		}
	}

	async function confirmarImportacion() {
		try {
			const resultado = await importarInsumos(filas);
			toast.success(`${resultado.cantidad} insumos importados`);
			goto(resolve('/insumos'));
		} catch {
			toast.error('No se pudo importar el listado');
		}
	}
</script>

<PageLayout>
	<a href={resolve('/insumos')} class="btn btn-ghost btn-sm">← Volver</a>
	<Can modulo="insumos" accion="import">
		<div class="card mt-4 bg-base-100 shadow">
			<div class="card-body gap-4">
				<h1 class="card-title">Importar insumos desde Excel</h1>
				<p class="text-sm text-base-content/70">
					Columnas requeridas: código, descripción, tipo, unidad y costo unitario. Categoría,
					proveedor y flete (%) son opcionales. Usá códigos o nombres; no necesitás conocer IDs.
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
				{#if errores.length}
					<div role="alert" class="alert alert-error">
						<div>
							{#each errores as error (error)}<p>{error}</p>{/each}
						</div>
					</div>
				{/if}
				{#if filas.length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead
								><tr
									><th>Código</th><th>Descripción</th><th>Tipo</th><th>Unidad</th><th>Costo base</th
									><th>Flete</th><th>Costo final</th><th>Categoría</th><th>Proveedor</th></tr
								></thead
							>
							<tbody>
								{#each filas.slice(0, 10) as fila (fila.codigo)}
									<tr
										><td>{fila.codigo}</td><td>{fila.nombre}</td><td>{fila.tipo}</td><td
											>{fila.unidad}</td
										><td>${fila.costo_unitario.toLocaleString('es-AR')}</td><td
											>{fila.flete_porcentaje}%</td
										><td
											>${(fila.costo_unitario * (1 + fila.flete_porcentaje / 100)).toLocaleString(
												'es-AR'
											)}</td
										><td>{fila.categoria || '-'}</td><td>{fila.proveedor || '-'}</td></tr
									>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-sm">{filas.length} filas válidas. Se muestran las primeras 10.</span>
						<button class="btn btn-primary" onclick={confirmarImportacion}
							>Confirmar importación</button
						>
					</div>
				{/if}
			</div>
		</div>
	</Can>
</PageLayout>
