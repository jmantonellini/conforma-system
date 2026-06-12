<script lang="ts">
	import Logo from '$lib/assets/Logo.png';
	let { session } = $props();
</script>

<header class="navbar bg-base-100 px-10 py-4 shadow-sm">
	<div class="navbar-start h-auto">
		<img src={Logo} alt="Conforma Logo" class="h-10 w-auto" />
	</div>
	<div class="navbar-end">
		{#if session}
			<!-- <span>Bienvenido, {data.session?.username} ({data.session.rol})</span> -->
			<form method="POST" action="/logout">
				<button class="btn btn-ghost" type="submit">Cerrar sesión</button>
			</form>
		{/if}
	</div>
</header>
