<!-- src/routes/pedidos/+page.svelte -->
<script lang="ts">
  import { getPedidos, getEstadosPedido } from '$lib/remote/pedidos.remote';
  import { Table, PageHeader, PageLayout, SearchBar, Pagination } from '$lib/components/ui';
  import { resolve } from '$app/paths';
  import { debounce } from '$lib/utils';
  import { Eye } from '$lib/components/ui/icons';


  // Estado
  let search = $state('');
  let needSuggestionsFor = $state<string | undefined>(undefined);
  let estadoFilter = $state<number | undefined>(undefined);
  let currentPage = $state(1);

  // Datos estáticos
  let estados = $derived(await getEstadosPedido());

  function handleSearchChange() {
    needSuggestionsFor = search === '' ? undefined : search;
    currentPage = 1;
  }
</script>

<PageLayout>
  <PageHeader title="Pedidos" description="Gestiona los pedidos de la empresa" />

  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-1 flex-wrap gap-4">
      <div class="w-full sm:w-80">
        <SearchBar bind:search oninput={() => debounce(handleSearchChange)} />
      </div>

      <select bind:value={estadoFilter} class="select w-48">
        <option value={undefined}>Todos los estados</option>
        {#each estados as est (est.id)}
          <option value={est.id}>{est.nombre}</option>
        {/each}
      </select>
    </div>

    <a class="btn btn-primary" href={resolve('/pedidos/crear')}>+ Nuevo Pedido</a>
  </div>

  <svelte:boundary>
    {let pedidosData = $derived(
      await getPedidos({
        search: needSuggestionsFor,
        estadoId: estadoFilter,
        page: currentPage
      })
    );}
    
    {#snippet pending()}
      <div class="flex justify-center py-8">
        <span class="loading loading-lg loading-spinner"></span>
      </div>
    {/snippet}
    
    {#if $effect.pending()}
      <div class="flex justify-center py-8">
        <span class="loading loading-lg loading-spinner"></span>
      </div>
    {:else}
      <div class="card bg-base-100 shadow">
        <div class="card-body p-0">
          {#snippet header()}
            <th>N° Pedido</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th class="text-right">Total</th>
            <th>Estado</th>
            <th class="text-center">Acciones</th>
          {/snippet}

          {#snippet row(pedido)}
            <td class="font-mono text-sm">{pedido.numero_pedido}</td>
            <td class="font-medium">{pedido.cliente_nombre || '-'}</td>
            <td>{new Date(pedido.fecha).toLocaleDateString()}</td>
            <td class="text-right font-medium">
              ${pedido.total?.toLocaleString() || 0}
            </td>
            <td>
              <span 
                class={`badge badge-${pedido.estado_color}`}
              >
                {pedido.estado_nombre}
              </span>
            </td>
            <td class="text-center">
              <a 
                class="btn btn-ghost btn-circle btn-sm" 
                href={resolve(`/pedidos/${pedido.id}`)}
                title="Ver pedido"
              >
                <Eye />
              </a>
            </td>
          {/snippet}

          <Table
            data={pedidosData.data}
            loading={false}
            emptyMessage="No hay pedidos registrados"
            {header}
            {row}
          />
        </div>
      </div>

      {#if pedidosData.totalPages > 1}
        <div class="mt-6 flex justify-center">
          <Pagination
            currentPage={pedidosData.currentPage}
            totalPages={pedidosData.totalPages}
            onPageChange={(page) => (currentPage = page)}
          />
        </div>
      {/if}
    {/if}
  </svelte:boundary>
</PageLayout>