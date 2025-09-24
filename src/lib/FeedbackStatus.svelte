<script>
  export let initialBatchId = '';
  let batchId = initialBatchId;
  let loading = false;
  let error = '';
  let results = null;

  // Keep the input in sync when parent provides/updates a batchId
  $: if (initialBatchId && batchId !== initialBatchId) {
    batchId = initialBatchId;
  }

  async function checkStatus() {
    error = '';
    results = null;
    if (!batchId) {
      error = 'Ingresa un batchId.';
      return;
    }
    loading = true;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        results = data.data;
      } else {
        error = data.error || 'No se pudo consultar el estado.';
      }
    } catch (e) {
      error = 'Error de red o API.';
    }
    loading = false;
  }
</script>

<div class="w-full border rounded p-4 bg-gray-50">
  <div class="flex items-end gap-2">
    <div class="flex-1">
      <label for="batchIdInput" class="block text-sm font-semibold text-gray-700">Batch ID</label>
      <input id="batchIdInput" type="text" bind:value={batchId} placeholder="29759da7-..." class="w-full border rounded px-3 py-2" />
    </div>
    <button type="button" on:click={checkStatus} class="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300" disabled={loading || !batchId}>
      {#if loading}Consultando...{:else}Consultar estado{/if}
    </button>
  </div>
  {#if error}
    <div class="mt-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded px-3 py-2">{error}</div>
  {/if}
  {#if results}
    <div class="mt-3">
      <div class="text-sm text-gray-700">Respuesta:</div>
      <pre class="mt-1 text-xs bg-white border rounded p-3 overflow-auto max-h-64">{JSON.stringify(results, null, 2)}</pre>
    </div>
  {/if}
</div>

<style>
  pre {
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
