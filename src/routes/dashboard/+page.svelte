<script lang="ts">
	import type { PageProps } from '../$types';

	let { data }: PageProps = $props();

	async function createUser() {
		const username = prompt('Usuario:');
		const password = prompt('Contraseña:');
		const role = prompt('Rol (admin/jefePlanta/operario/oficina):');

		await fetch('/api/admin/users', {
			method: 'POST',
			body: JSON.stringify({ username, password, role }),
			headers: { 'Content-Type': 'application/json' }
		});

		location.reload();
	}
</script>

<h1 class="p-4 text-2xl font-bold">Panel de Administración</h1>

<button onclick={createUser} class="m-4 rounded bg-green-600 px-4 py-2 text-white">
	+ Crear Usuario
</button>

<table class="w-full border-collapse">
	<thead>
		<tr class="bg-gray-200">
			<th class="border p-2">Usuario</th>
			<th class="border p-2">Rol</th>
		</tr>
	</thead>
	<tbody>
		{#each data.users as user (user.id)}
			<tr>
				<td class="border p-2">{user.username}</td>
				<td class="border p-2">{user.role}</td>
			</tr>
		{/each}
	</tbody>
</table>
