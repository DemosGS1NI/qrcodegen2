<script>
  export let initialBatchId = '';
  let batchId = initialBatchId;
  let loading = false;
  let error = '';
  let results = null;
  let lastChecked = null;
  let pollTimer;
  const TERMINAL_CODES = new Set([1,2,4,5]); // success/fail final states
  const PENDING_CODES = new Set([7]);

  // React to incoming batchId changes
  $: if (initialBatchId && batchId !== initialBatchId) {
    batchId = initialBatchId;
    if (batchId) {
      startPolling();
    }
  }

  function clearPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  async function fetchStatus() {
    if (!batchId) return;
    loading = true;
    error = '';
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
    lastChecked = new Date();
    loading = false;
  }

  function isTerminal() {
    if (!results) return false;
    if (typeof results.code === 'number' && TERMINAL_CODES.has(results.code)) return true;
    if (Array.isArray(results.codes) && results.codes.some(c => TERMINAL_CODES.has(c))) return true;
    return false;
  }

  function shouldContinue() {
    if (!results) return true; // no data yet
    if (isTerminal()) return false;
    // Continue if any pending code
    if (typeof results.code === 'number' && PENDING_CODES.has(results.code)) return true;
    if (Array.isArray(results.codes) && results.codes.some(c => PENDING_CODES.has(c))) return true;
    return false;
  }

  async function pollCycle() {
    await fetchStatus();
    if (shouldContinue()) {
      pollTimer = setTimeout(pollCycle, 2500); // 2.5s interval
    }
  }

  function startPolling() {
    clearPolling();
    results = null;
    pollCycle();
  }

  // Start polling immediately if an initial batchId is set
  if (batchId) {
    startPolling();
  }

  // Cleanup on destroy
  import { onDestroy } from 'svelte';
  onDestroy(() => clearPolling());
</script>

<div class="w-full border rounded p-4 bg-gray-50">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
    <div class="text-sm">
      <span class="font-semibold text-gray-700">Batch ID:</span>
      <span class="ml-1 font-mono text-gray-800 break-all">{batchId}</span>
    </div>
    <div class="text-xs text-gray-500">
      {#if loading}
        Consultando estado...
      {:else if lastChecked}
        Última verificación: {lastChecked.toLocaleTimeString()}{#if shouldContinue()} (continuando...) {/if}
      {/if}
    </div>
  </div>
  {#if error}
    <div class="mt-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded px-3 py-2">{error}</div>
  {/if}
  {#if results}
    <div class="mt-3">
      <div class="text-sm text-gray-700">Respuesta:</div>
      <pre class="mt-1 text-xs bg-white border rounded p-3 overflow-auto max-h-64">{JSON.stringify(results, null, 2)}</pre>
      <!-- Response code meaning table -->
      <div class="mt-4">
        <div class="text-sm font-semibold mb-2">Significado de códigos de respuesta:</div>
        <table class="w-full text-xs border border-gray-300 rounded">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-2 py-1 border">Code</th>
              <th class="px-2 py-1 border">Meaning</th>
              <th class="px-2 py-1 border">Description</th>
            </tr>
          </thead>
          <tbody>
            {#each [
              { code: 1, meaning: 'CREATED', description: 'Record created successfully' },
              { code: 2, meaning: 'MODIFIED', description: 'Record modified successfully' },
              { code: 4, meaning: 'DELETED', description: 'Record deleted successfully' },
              { code: 5, meaning: 'FAILED', description: 'The operation failed due to validation errors or other reasons' },
              { code: 7, meaning: 'PENDING', description: 'The batch operation has been accepted and is pending processing' }
            ] as row}
              <tr class={results?.code == row.code || (Array.isArray(results?.codes) && results.codes.includes(row.code)) ? 'bg-green-50 font-bold' : ''}>
                <td class="px-2 py-1 border text-center">{row.code}</td>
                <td class="px-2 py-1 border">{row.meaning}</td>
                <td class="px-2 py-1 border">{row.description}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  pre {
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
