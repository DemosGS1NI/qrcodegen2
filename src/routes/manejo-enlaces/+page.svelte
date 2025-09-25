<script>
  import GtinSearch from './GtinSearch.svelte';
  import LinksTable from './LinksTable.svelte';
  import LinkEditor from './LinkEditor.svelte';
  import FeedbackStatus from './FeedbackStatus.svelte';
  let gtin = '';
  let description = '';
  let links = [];
  let batchId = '';
  let loading = false;
  let error = '';
  let showUI = false;
  // Handlers for child events
  function handleGtinFound(e) {
    // Clear previous state first
    error = '';
    showUI = false;
    // Clear any previous batch status because GTIN lookup does not produce a batch
    batchId = '';
    if (e.detail.gtin) {
      gtin = e.detail.gtin;
      description = e.detail.description;
      links = e.detail.links || [];
      showUI = true;
    } else {
      gtin = '';
      description = '';
      links = [];
      showUI = false;
    }
  }
  // refreshLinks is no longer needed; handled in GtinSearch
  function handleLinksChanged(e) {
    // After create/modify, clear all except batchId (for FeedbackStatus)
    gtin = '';
    description = '';
    links = [];
    error = '';
    showUI = false;
    // batchId is set by handleBatch
  }
  function handleBatch(e) {
    batchId = e.detail.batchId;
  }
  function handleError(e) {
    error = e.detail.error;
    gtin = '';
    description = '';
    links = [];
    showUI = false;
  }
  let linksTableRef;
  let linkEditorRef;
</script>

<div class="px-8 py-8 w-full font-sans">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-[#003366] tracking-tight">Gestionar Enlaces</h1>
    <p class="mt-2 text-sm text-gray-600 max-w-prose">Busca un GTIN, revisa los enlaces existentes y agrega nuevos. Las operaciones de creación, modificación o eliminación generan un <span class="font-semibold">Batch</span> que se monitorea automáticamente.</p>
  </div>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5 font-sans">
    <GtinSearch on:searching={() => { showUI = false; gtin=''; description=''; links=[]; error=''; batchId=''; }} on:found={handleGtinFound} on:error={(e) => { handleError(e); batchId=''; }} />
  </div>
  {#if showUI}
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5 overflow-hidden font-sans">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-[#003366]">Enlaces Existentes</h2>
        <button
          type="button"
          class="btn btn-danger"
          on:click={() => linksTableRef?.deleteAll()}
          disabled={!gtin || links.length === 0}
          title="Eliminar todos los enlaces de este GTIN (incluye el enlace por defecto)">
          Eliminar todos
        </button>
      </div>
      <LinksTable bind:this={linksTableRef} {gtin} {links} key={gtin} on:deleted={handleLinksChanged} on:batch={handleBatch} on:error={handleError} />
    </div>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5 font-sans">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-[#003366]">Agregar enlaces</h2>
        <div class="flex items-center gap-2">
          {#if linkEditorRef?.hasRows()}
            <button type="button" class="btn btn-secondary" on:click={() => linkEditorRef?.cancel()}>Cancelar</button>
          {/if}
          <button type="button" class="btn btn-success disabled:opacity-60" on:click={() => linkEditorRef?.add()} disabled={linkEditorRef?.hasRows?.()}>+ Agregar enlace</button>
        </div>
      </div>
      <LinkEditor bind:this={linkEditorRef} {gtin} {description} {links} key={gtin} on:updated={handleLinksChanged} on:batch={handleBatch} on:error={handleError} />
    </div>
  {/if}
  {#if batchId}
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5 font-sans">
      <h2 class="text-xl font-semibold text-[#003366] mb-4">Estado del batch</h2>
      <FeedbackStatus initialBatchId={batchId} key={batchId} />
    </div>
  {/if}
  {#if error}
    <div class="bg-red-50 text-red-800 p-4 rounded-lg mt-6 text-sm font-semibold border border-red-200 shadow-sm">{error}</div>
  {/if}
</div>
