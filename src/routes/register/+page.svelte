<script lang="ts">
	import { enhance } from "$app/forms";

	let username = $state('');
	let password = $state('');
	let error = $state('');
</script>

<div>
	<form method="post" use:enhance class="flex h-full items-center justify-center" >
		<fieldset class="fieldset w-xs rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Register</legend>

			<label for="username" class="label">Username</label>
			<input type="text" name="username" id="username" class="input" bind:value={username} placeholder="Username" />

			<label for="password" class="label">Password</label>
			<input type="password" name="password" id="password" class="input" bind:value={password} placeholder="Password" />

			<button type="submit" class="btn mt-4 btn-neutral">Register</button>

			{#if error}
				<p class="mt-4 text-red-500">{error}</p>
			{/if}
		</fieldset>
	</form>
</div>
