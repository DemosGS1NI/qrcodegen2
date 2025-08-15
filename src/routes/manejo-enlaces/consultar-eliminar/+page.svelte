<script>
  import { onMount } from 'svelte';
  let searchGtin = '';
  let queryLoading = false;
  let queryError = '';
  let queryResults = [];
  let deleteLoading = false;
  let deleteError = '';
  let deleteSuccess = '';

  async function queryLinks() {
    queryLoading = true;
    queryError = '';
    queryResults = [];
    try {
      const res = await fetch('/api/query-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin: searchGtin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        queryResults = Array.isArray(data.links) ? data.links : [];
        queryError = '';
        // Show message about records found
        if (queryResults.length > 0) {
          queryError = `${queryResults.length} registro(s) encontrado(s).`;
        } else {
          queryError = 'No se encontraron registros.';
        }
      } else {
        queryError = data.error || 'No se pudieron consultar los enlaces.';
      }
    } catch (e) {
      queryError = 'Error de red o API.';
    }
    queryLoading = false;
  }

  async function deleteLink(link) {
    if (!searchGtin || !link) return;
    if (!confirm('¡Advertencia! Esta acción eliminará TODOS los enlaces asociados a este GTIN. ¿Desea continuar?')) return;
    deleteLoading = true;
    deleteError = '';
    deleteSuccess = '';
    try {
      const res = await fetch('/api/delete-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin: searchGtin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        deleteSuccess = 'Todos los enlaces para este GTIN han sido eliminados.';
        queryResults = [];
      } else {
        deleteError = data.error || 'No se pudo eliminar los enlaces.';
      }
    } catch (e) {
      deleteError = 'Error de red o API.';
    }
    deleteLoading = false;
  }
</script>

<div class="p-12 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
  <h1 class="text-3xl font-bold mb-8 text-[#003366]">Consultar / Eliminar Enlaces</h1>
  <div class="mb-8">
    <label for="searchGtin" class="block text-lg font-semibold text-[#003366] mb-2">Buscar enlaces por GTIN</label>
    <div class="flex gap-2">
      <input id="searchGtin" type="text" bind:value={searchGtin} class="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans w-64" placeholder="Ej: 07433200904022" autocomplete="on" />
      <button type="button" class="px-6 py-3 bg-[#00853f] text-white rounded-lg font-semibold text-lg transition-colors hover:bg-[#006b2e] focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-300 flex items-center gap-2" on:click={queryLinks} disabled={queryLoading || !searchGtin}>
        {#if queryLoading}
          <svg class="animate-spin h-5 w-5 text-white mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          Buscando...
        {:else}
          Buscar
        {/if}
      </button>
    </div>
    {#if queryError}
      <div class="bg-gray-100 text-gray-800 p-3 rounded-lg mt-2 text-base font-semibold border border-gray-300 shadow">{queryError}</div>
    {/if}
    {#if queryResults.length > 0}
      <div class="mt-6">
        <div class="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 font-semibold rounded">
          <span>Advertencia: El botón eliminar borrará <b>TODOS</b> los enlaces asociados a este GTIN.</span>
        </div>
        <table class="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2 text-left">Tipo de enlace</th>
              <th class="px-4 py-2 text-left">Título</th>
              <th class="px-4 py-2 text-left">Idioma</th>
              <th class="px-4 py-2 text-left">País</th>
              <th class="px-4 py-2 text-left">URL</th>
              <th class="px-4 py-2 text-left">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {#each queryResults as link}
              <tr class="border-t">
                <td class="px-4 py-2">{link.linkType}</td>
                <td class="px-4 py-2">{link.linkTitle}</td>
                <td class="px-4 py-2">{link.language}</td>
                <td class="px-4 py-2">{link.context}</td>
                <td class="px-4 py-2"><a href={link.targetUrl} target="_blank" class="text-blue-700 underline">{link.targetUrl}</a></td>
                <td class="px-4 py-2">
                  <button type="button" class="px-4 py-2 bg-red-600 text-white rounded font-semibold text-base hover:bg-red-700 disabled:bg-gray-300" on:click={() => deleteLink(link)} disabled={deleteLoading} title="Eliminar todos los enlaces de este GTIN">
                    {#if deleteLoading}
                      <svg class="animate-spin h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    {:else}
                      Eliminar
                    {/if}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if deleteError}
          <div class="bg-red-100 text-red-800 p-3 rounded-lg mt-2 text-base font-semibold border border-red-300 shadow">{deleteError}</div>
        {/if}
        {#if deleteSuccess}
          <div class="bg-green-100 text-green-800 p-3 rounded-lg mt-2 text-base font-semibold border border-green-300 shadow">{deleteSuccess}</div>
        {/if}
      </div>
    {/if}
  </div>
</div>
