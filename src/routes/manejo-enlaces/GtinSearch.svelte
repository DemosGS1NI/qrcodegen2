<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let gtin = '';
  let description = '';
  let loading = false;
  let error = '';
  let errorCode = '';
  let errorMessage = '';

  async function handleSearch() {
  error = '';
  errorCode = '';
  errorMessage = '';
  if (!gtin) return;
  loading = true;
    dispatch('searching');
    try {
      // 1. Verify GTIN and get description
      const descRes = await fetch('/api/get-gtin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin })
      });
      const descData = await descRes.json().catch(() => ({}));
      console.log('Debug get-gtin descData:', descData);
      // If request failed at transport level
      if (!descRes.ok) {
        error = 'Error de red o API.';
        dispatch('error', { error });
        loading = false;
        return;
      }
      // Validation / not-found style condition (success false OR validation code present)
      if (!descData.success || descData.errorCode || descData.errorMessage) {
        errorCode = descData.errorCode || '';
        errorMessage = descData.errorMessage || '';
        // Provide a friendlier base message
        if (errorCode === 'E039') {
          error = 'GTIN no reconocido como soportado para cadenas globales abiertas';
        } else {
          error = 'El GTIN no existe en el registry';
        }
        description = '';
        dispatch('error', { error, errorCode, errorMessage });
        loading = false;
        return;
      }
      description = descData.productDescription || '';
      // Clear any residual codes if success
      errorCode = '';
      errorMessage = '';

      // 2. Fetch links
      const linksRes = await fetch('/api/query-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin })
      });
      const linksData = await linksRes.json().catch(() => ({}));
      let links = [];
      if (linksRes.ok && linksData.success) {
        links = linksData.links || [];
      }
      dispatch('found', { gtin, description, links });
    } catch (e) {
      error = 'Error de red o API.';
      dispatch('error', { error });
    }
    loading = false;
  }
</script>
<div>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-[#003366]">GTIN</h2>
  </div>
  <label for="gtinInput" class="sr-only">GTIN</label>
  <div class="flex items-center gap-3 flex-wrap">
  <input id="gtinInput" type="text" bind:value={gtin} maxlength="14" class="w-[28ch] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm font-sans" placeholder="07433200904022" disabled={loading} />
  <button type="button" class="btn btn-primary" on:click={handleSearch} disabled={loading || !gtin}>
      {#if loading}
        <span class="animate-pulse">Buscando...</span>
      {:else}
        Buscar
      {/if}
    </button>
    {#if description}
      <div class="text-base md:text-lg font-semibold text-[#003366] max-w-[64ch] truncate" title={description}>
        {description}
      </div>
    {/if}
  </div>
  {#if error}
    <div class="mt-2 text-sm text-red-700">
      {error}
      {#if errorCode || errorMessage}
        <div class="mt-1">
          {#if errorCode}<b>{errorCode}</b>{/if}
          {#if errorMessage}<span class="ml-2">{errorMessage}</span>{/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
