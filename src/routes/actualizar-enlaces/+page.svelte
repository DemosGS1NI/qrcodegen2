<script>
  import { onMount } from 'svelte';
  let gtin = '';
  let itemDescription = '';
  let targetUrl = '';
  let linkType = 'gs1:pip';
  let linkTitle = '';
  let language = 'es';
  let country = '';
  let searchGtin = '';
  let queryLoading = false;
  let queryError = '';
  let queryResults = [];
  let loading = false;
  let success = '';
  let error = '';
  let deleteLoading = false;
  let deleteError = '';
  let deleteSuccess = '';
  let linkTypes = [];
  let countries = [];
  let languages = [];

  onMount(async () => {
  const res = await fetch('/gs1-linktypes.json');
    linkTypes = await res.json();
  const resCountries = await fetch('/countries.json');
    countries = await resCountries.json();
    // Set Nicaragua (NI) as default if present, otherwise use first country
    const ni = countries.find(c => c.code === 'NI');
    country = ni ? ni.code : (countries.length > 0 ? countries[0].code : '');
  const resLanguages = await fetch('/languages.json');
    languages = await resLanguages.json();
    if (languages.length > 0) language = languages.find(l => l.code === 'es') ? 'es' : languages[0].code;
  });

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
        queryResults = data.data.responses || [];
      } else {
        queryError = data.error || 'No se pudieron consultar los enlaces.';
      }
    } catch (e) {
      queryError = 'Error de red o API.';
    }
    queryLoading = false;
  }

  async function updateLink() {
    loading = true;
    success = '';
    error = '';
    const body = [
      {
        identificationKeyType: 'gtin',
        identificationKey: gtin,
        itemDescription,
        qualifierPath: '/',
        public: true,
        responses: [
          {
            linkType,
            language,
            context: country.toLowerCase(),
            mimeType: 'text/html',
            linkTitle,
            targetUrl,
            defaultLinkType: true,
            defaultLanguage: true,
            defaultContext: true,
            defaultMimeType: true,
            fwqs: true,
            public: true
          }
        ]
      }
    ];
    try {
      const res = await fetch('/api/update-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        success = '¡Enlace actualizado exitosamente!';
        gtin = '';
        itemDescription = '';
        targetUrl = '';
        linkType = 'gs1:pip';
        linkTitle = '';
        language = 'es';
        country = countries.length > 0 ? countries[0].code : '';
      } else {
        error = data.error || 'Error al actualizar el enlace.';
      }
    } catch (e) {
      error = 'Error de red o API.';
    }
    loading = false;
  }
</script>
<div class="p-12 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
  <h1 class="text-4xl font-bold mb-8 text-[#003366]">Actualizar enlaces</h1>
  <form class="space-y-8" on:submit|preventDefault={updateLink} autocomplete="on">
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
        <div class="bg-red-100 text-red-800 p-3 rounded-lg mt-2 text-base font-semibold border border-red-300 shadow">{queryError}</div>
      {/if}
      {#if queryResults.length > 0}
        <div class="mt-6">
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
                    <button type="button" class="px-4 py-2 bg-red-600 text-white rounded font-semibold text-base hover:bg-red-700 disabled:bg-gray-300" on:click={() => deleteLink(link)} disabled={deleteLoading} title="Eliminar este enlace">
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
    <div>
      <label for="gtinInput" class="block text-lg font-semibold text-[#003366] mb-2">GTIN
        <span class="ml-1 text-gray-400 cursor-help" title="Código Global de Identificación de Producto">&#9432;</span>
      </label>
      <input id="gtinInput" type="text" bind:value={gtin} class="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Ej: 07433200904022" required autocomplete="on" />
    </div>
    <div>
      <label for="descInput" class="block text-lg font-semibold text-[#003366] mb-2">Descripción del producto
        <span class="ml-1 text-gray-400 cursor-help" title="Breve descripción para identificar el producto">&#9432;</span>
      </label>
      <input id="descInput" type="text" bind:value={itemDescription} class="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Ej: Nekutik Crunchy de Sésamo Negro" required autocomplete="on" />
    </div>
    <div>
      <label for="linkTypeSelect" class="block text-lg font-semibold text-[#003366] mb-2">Tipo de enlace
        <span class="ml-1 text-gray-400 cursor-help" title="Selecciona el tipo de enlace GS1 Digital Link">&#9432;</span>
      </label>
      <select id="linkTypeSelect" bind:value={linkType} class="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all">
        {#each linkTypes as lt}
          <option value={lt.value}>{lt.label}</option>
        {/each}
      </select>
      {#if linkTypes.length > 0}
        {#each linkTypes as lt}
          {#if lt.value === linkType}
            <div class="mt-2 text-base text-gray-700 bg-gray-100 rounded p-3 border border-gray-200">
              <b>Valor:</b> <code class="bg-white border px-1 rounded text-blue-900">{lt.value}</code><br>
              <b>Descripción:</b> {lt.description}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
    <div>
      <label for="linkTitleInput" class="block text-lg font-semibold text-[#003366] mb-2">Título del enlace</label>
      <input id="linkTitleInput" type="text" bind:value={linkTitle} class="w-full border rounded px-3 py-2 text-base font-sans" placeholder="Ej: Página principal, Receta, etc." required />
    </div>
    <div>
      <label for="languageSelect" class="block text-lg font-semibold text-[#003366] mb-2">Idioma</label>
      <select id="languageSelect" bind:value={language} class="w-full border rounded px-3 py-2 text-base font-sans">
        {#each languages as lang}
          <option value={lang.code}>{lang.name} ({lang.code})</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="countrySelect" class="block text-lg font-semibold text-[#003366] mb-2">País</label>
      <select id="countrySelect" bind:value={country} class="w-full border rounded px-3 py-2 text-base font-sans">
        {#each countries as c}
          <option value={c.code}>{c.name} ({c.code})</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="urlInput" class="block text-lg font-semibold text-[#003366] mb-2">URL destino
        <span class="ml-1 text-gray-400 cursor-help" title="Enlace al que se redirigirá el usuario">&#9432;</span>
      </label>
      <input id="urlInput" type="url" bind:value={targetUrl} class="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Ej: https://linktr.ee/amilitheblacksesame" required autocomplete="on" />
    </div>
    <button type="submit" class="w-full px-8 py-4 bg-[#003366] text-white rounded-lg font-semibold text-xl transition-colors hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={loading}>
      {#if loading}
        <svg class="animate-spin h-6 w-6 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        Actualizando...
      {:else}
        Actualizar enlace
      {/if}
    </button>
    {#if success}
      <div class="bg-green-100 text-green-800 p-4 rounded-lg mt-4 text-lg font-semibold border border-green-300 shadow">{success}</div>
    {/if}
    {#if error}
      <div class="bg-red-100 text-red-800 p-4 rounded-lg mt-4 text-lg font-semibold border border-red-300 shadow">{error}</div>
    {/if}
  </form>
</div>
