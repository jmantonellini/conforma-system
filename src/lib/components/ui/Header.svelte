<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Logo from '$lib/assets/Logo.png';
	import { logout } from '$lib/remote/auth.remote';
	let { session } = $props();

	async function handleLogout() {
		const result = await logout();
		if (result.success) {
			logout();
			goto(resolve('/login'));
		}
	}
</script>

<header class="navbar bg-base-100 px-10 py-4 shadow-sm">
	<div class="navbar-start h-auto">
		<img src={Logo} alt="Conforma Logo" class="h-10 w-auto" />
	</div>
	<div class="navbar-end">
		{#if session}
			<!-- <span>Bienvenido, {data.session?.username} ({data.session.rol})</span> -->
			<button onclick={handleLogout} class="btn btn-ghost" type="submit">Cerrar sesión</button>
		{/if}
	</div>
</header>
