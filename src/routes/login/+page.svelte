<script lang="ts">
	import { enhance } from '$app/forms';

	let username = $state('');
	let password = $state('');

	const { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center">
	<form method="post" use:enhance class="flex h-full items-center justify-center">
		<fieldset class="fieldset w-xs rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Login</legend>

			<label for="username" class="label">Username</label>
			<input
				type="text"
				name="username"
				id="username"
				class="input"
				required
				bind:value={username}
				placeholder="Username"
				autocomplete="username"
			/>

			<label for="password" class="label">Password</label>
			<input
				type="password"
				name="password"
				id="password"
				class="input"
				required
				bind:value={password}
				placeholder="Password"
				autocomplete="current-password"
			/>

			<button type="submit" class="btn mt-4 btn-neutral">Login</button>

			{#if form?.error}
				<p class="mt-4 text-red-500">{form.error}</p>
			{/if}
		</fieldset>
	</form>
</div>
