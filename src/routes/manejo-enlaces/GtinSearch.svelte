<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let gtin = '';
  let description = '';
  let loading = false;
  let error = '';
  let errorCode = '';
  let errorMessage = '';

  function normalizeGtin(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 13) return `0${digits}`;
    return digits;
  }

  async function handleSearch() {
  error = '';
  errorCode = '';
  errorMessage = '';
  const normalizedGtin = normalizeGtin(gtin);
  if (!normalizedGtin) return;
  gtin = normalizedGtin;
  loading = true;
    dispatch('searching');
    try {
      // 1. Verify GTIN and get description
      const descRes = await fetch('/api/get-gtin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin: normalizedGtin })
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
        body: JSON.stringify({ gtin: normalizedGtin })
      });
      const linksData = await linksRes.json().catch(() => ({}));
      let links = [];
      if (linksRes.ok && linksData.success) {
        links = linksData.links || [];
      }
      dispatch('found', { gtin: normalizedGtin, description, links });
    } catch (e) {
      error = 'Error de red o API.';
      dispatch('error', { error });
    }
    loading = false;
  }
</script>
<div>
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-lg gs1-card-title">Busqueda por GTIN</h2>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_auto_1fr] gap-2 items-end">
    <div>
      <label for="gtinInput" class="gs1-field-label">GTIN</label>
      <input
        id="gtinInput"
        type="text"
        bind:value={gtin}
        maxlength="14"
        on:blur={() => gtin = normalizeGtin(gtin)}
        class="gs1-input w-full"
        placeholder="07433200904022"
        disabled={loading}
      />
    </div>

    <button type="button" class="btn btn-primary btn-md" on:click={handleSearch} disabled={loading || !gtin}>
      {#if loading}
        <span class="animate-pulse">Buscando...</span>
      {:else}
        Buscar
      {/if}
    </button>

    <div class="min-h-[2.25rem] flex items-center">
      {#if description}
        <div class="text-sm md:text-base font-semibold text-[var(--gs1-blue)] max-w-[64ch] truncate" title={description}>
          {description}
        </div>
      {/if}
    </div>
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
