<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} | Conforma</title>
</svelte:head>

<main class="hero min-h-screen bg-base-200 px-6">
	<div class="hero-content max-w-xl text-center">
		<div class="space-y-5">
			<p class="text-sm font-semibold text-primary uppercase">Conforma</p>
			<p class="font-mono text-7xl font-bold text-primary">{page.status}</p>
			<h1 class="text-3xl font-semibold">
				{page.status === 404 ? 'No encontramos esa página' : 'Algo salió mal'}
			</h1>
			<p class="text-base-content/70">
				{page.status === 404
					? (page.error?.message ?? 'El recurso que buscás no existe o ya no está disponible.')
					: 'Ocurrió un error inesperado. Probá de nuevo en unos minutos.'}
			</p>
			<a class="btn btn-primary" href={resolve('/')}>Volver al inicio</a>
		</div>
	</div>
</main>
