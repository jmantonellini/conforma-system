<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, PageLayout } from '$lib/components/ui';
	import { importarContactos } from '$lib/remote/contactos.remote';
	import { toast } from '$lib/stores/toast.svelte';

	type FilaContacto = {
		razon_social: string;
		nombre?: string;
		apellido?: string;
		cuit?: string;
		email?: string;
		telefono?: string;
		rol: 'ninguno' | 'cliente' | 'proveedor' | 'ambos';
		es_distribuidor: boolean;
		porcentaje_compensacion: number;
		saldo_disponible: number;
	};

	let archivo = $state<File | undefined>();
	let importando = $state(false);
	let filas = $state<FilaContacto[]>([]);
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
			const respuesta = await fetch('/contactos/importar', { method: 'POST', body: formData });
			const resultado = (await respuesta.json()) as {
				error?: string;
				errores?: string[];
				filas?: FilaContacto[];
				cantidad?: number;
			};
			if (!respuesta.ok)
				throw new Error([resultado.error, ...(resultado.errores ?? [])].filter(Boolean).join('. '));
			filas = resultado.filas ?? [];
			toast.success(`${resultado.cantidad ?? 0} contactos listos para importar`);
		} catch (error) {
			errores = [error instanceof Error ? error.message : 'No se pudo analizar el archivo'];
		} finally {
			importando = false;
		}
	}

	async function confirmarImportacion() {
		try {
			const resultado = await importarContactos(filas);
			toast.success(`${resultado.cantidad} contactos importados`);
			goto(resolve('/contactos'));
		} catch {
			toast.error('No se pudo importar el listado');
		}
	}
</script>

<PageLayout>
	<a href={resolve('/contactos')} class="btn btn-ghost btn-sm">← Volver</a>
	<Can modulo="contactos" accion="create">
		<div class="card mt-4 bg-base-100 shadow">
			<div class="card-body gap-4">
				<h1 class="card-title">Importar contactos desde Excel</h1>
				<p class="text-sm text-base-content/70">
					Columna requerida: razón social. También podés incluir nombre, apellido, CUIT, email,
					teléfono, rol, distribuidor, compensación, comisión, saldo y datos de proveedor.
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
									><th>Razón social</th><th>Nombre</th><th>Apellido</th><th>CUIT</th><th>Rol</th><th
										>Distribuidor</th
									><th>Saldo</th></tr
								></thead
							>
							<tbody>
								{#each filas.slice(0, 10) as fila (fila.cuit || `${fila.razon_social}-${fila.nombre}-${fila.apellido}`)}
									<tr
										><td>{fila.razon_social}</td><td>{fila.nombre || '-'}</td><td
											>{fila.apellido || '-'}</td
										><td>{fila.cuit || '-'}</td><td>{fila.rol}</td><td
											>{fila.es_distribuidor ? 'Sí' : 'No'}</td
										><td>${fila.saldo_disponible.toLocaleString('es-AR')}</td></tr
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
