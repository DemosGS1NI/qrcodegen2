<script>
  import GtinSearch from './GtinSearch.svelte';
  import LinksTable from './LinksTable.svelte';
  let gtin = '';
  let links = [];
  let error = '';
  let showUI = false;

  function handleGtinFound(e) {
    error = '';
    showUI = false;

    if (e.detail.gtin) {
      gtin = e.detail.gtin;
      links = e.detail.links || [];
      showUI = true;
    } else {
      gtin = '';
      links = [];
      showUI = false;
    }
  }

  function handleError(e) {
    error = e.detail.error;
    gtin = '';
    links = [];
    showUI = false;
  }
</script>

<main class="gs1-page">
<div class="gs1-page-shell w-full">
  <div class="mb-4">
    <h1 class="text-3xl gs1-page-title tracking-tight">Consultar Enlaces</h1>
    <p class="mt-2 gs1-page-subtitle max-w-prose">Busca un GTIN para consultar sus enlaces actuales en modo solo lectura.</p>
  </div>
  <div class="gs1-card p-4 md:p-5 mb-4">
    <GtinSearch on:searching={() => { showUI = false; gtin=''; links=[]; error=''; }} on:found={handleGtinFound} on:error={handleError} />
  </div>
  {#if showUI}
  <div class="gs1-card p-4 md:p-5 mb-4 overflow-hidden">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl gs1-card-title">Enlaces Existentes</h2>
        <span class="text-sm text-gray-500">{links.length} enlace(s) encontrado(s)</span>
      </div>
      {#if links.length > 0}
        <LinksTable {links} key={gtin} />
      {:else}
        <div class="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          No se encontraron enlaces para este GTIN.
        </div>
      {/if}
    </div>
  {/if}
  {#if error}
    <div class="gs1-error-banner mt-6 text-sm">{error}</div>
  {/if}
</div>
</main>
