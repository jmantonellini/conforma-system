<script lang="ts">
  import { modal } from '$lib/stores/modal.svelte';
  import Modal from './Modal.svelte';

  function handleClose() {
    modal.close();
    modal.onClose?.();
  }
</script>

<Modal bind:open={modal.open} title={modal.title} onClose={handleClose}>
  {#if modal.content}
    {@render modal.content()}
  {/if}

  {#snippet actions()}
    {#if modal.actions}
      {@render modal.actions()}
    {:else}
      <button class="btn" onclick={handleClose}>Cerrar</button>
    {/if}
  {/snippet}
</Modal>