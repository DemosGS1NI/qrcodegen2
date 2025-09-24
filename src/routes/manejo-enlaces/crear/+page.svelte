<script>
  import { onMount } from 'svelte';
  import FeedbackStatus from '$lib/FeedbackStatus.svelte';
  let gtin = '';
  let itemDescription = '';
  let linkTypes = [];
  const defaultTitleFixed = 'Default Product Info';
  const defaultLinkTypeFixed = 'https://ref.gs1.org/voc/defaultLink';
  let defaultHref = '';
  let linksExtra = [];
  let languages = [];
  let countries = [];
  let loading = false;
  let success = '';
  let error = '';
  const restrictedLinkTypes = new Set(['gs1:eifu','gs1:epil','gs1:smpc','gs1:handledBy']);
  const hiddenInSelect = new Set([...restrictedLinkTypes, 'gs1:defaultLink', 'gs1:defaultLinkMulti']);
  let lastBatchId = '';
  let descLoading = false;
  let descMessage = '';

  onMount(async () => {
  const res = await fetch('/gs1-linktypes.json');
    linkTypes = await res.json();
  const resCountries = await fetch('/countries.json');
    countries = await resCountries.json();
  const resLanguages = await fetch('/languages.json');
    languages = await resLanguages.json();
  });

  async function fetchDescription() {
    descMessage = '';
    if (!gtin) {
      descMessage = 'Ingresa un GTIN para buscar la descripción.';
      return;
    }
    descLoading = true;
    try {
      const res = await fetch('/api/get-gtin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const desc = data.productDescription || '';
        if (desc) {
          itemDescription = desc;
          descMessage = 'Descripción obtenida y aplicada.';
        } else {
          descMessage = 'No se encontró descripción para este GTIN.';
        }
      } else {
        descMessage = data.error || 'No se pudo obtener la descripción.';
      }
    } catch (e) {
      descMessage = 'Error de red o API al obtener la descripción.';
    }
    descLoading = false;
  }

  async function createLink() {
    loading = true;
    success = '';
    error = '';
    // Validate default link (fixed title/linkType, user provides href)
    if (!defaultHref) {
      error = 'La URL del enlace por defecto es requerida.';
      loading = false;
      return;
    }

    // Map extras: normalize hreflang/context to arrays
    const extras = linksExtra.map((l) => ({
      '@linkType': l['@linkType'],
      hreflang: l.language ? [l.language] : undefined,
      context: l.context ? [String(l.context).toLowerCase()] : undefined,
      type: 'text/html',
      title: l.title,
      href: l.href
    }));

    // Validate each extra: required fields and restricted types
    for (const l of linksExtra) {
      if (!l['@linkType']) {
        error = 'Cada enlace adicional debe tener un tipo de enlace.';
        loading = false; return;
      }
      if (restrictedLinkTypes.has(l['@linkType'])) {
        error = `El tipo de enlace ${l['@linkType']} está restringido.`;
        loading = false; return;
      }
      if (!l.title) {
        error = 'Cada enlace adicional debe tener un título.';
        loading = false; return;
      }
      if (!l.href) {
        error = 'Cada enlace adicional debe tener una URL (href).';
        loading = false; return;
      }
      if (!l.language) {
        error = 'Cada enlace adicional debe especificar un idioma.';
        loading = false; return;
      }
      if (!l.context) {
        error = 'Cada enlace adicional debe especificar un contexto.';
        loading = false; return;
      }
    }

    // Validate at least one non-default link overall
    const candidateLinks = [...extras];
    const nonDefaultCount = candidateLinks.length;
    if (nonDefaultCount < 1) {
      error = 'Debes incluir al menos un enlace adicional no por defecto (E042).';
      loading = false;
      return;
    }

    // Ensure default href differs from each non-default href to avoid duplicates
    if (candidateLinks.some(l => l.href && l.href === defaultHref)) {
      error = 'La URL por defecto no puede coincidir con ninguna URL de enlaces no por defecto (E017).';
      loading = false;
      return;
    }

    // Optionally: de-dupe identical non-default hrefs
    const seen = new Set();
    for (const l of candidateLinks) {
      if (!l.href) continue;
      const key = `${l['@linkType']}|${l.href}|${(l.hreflang||[]).join(',')}|${(l.context||[]).join(',')}|${l.type||''}|${l.title||''}`;
      if (seen.has(key)) {
        error = 'Hay enlaces no por defecto duplicados en el formulario (E017).';
        loading = false;
        return;
      }
      seen.add(key);
    }

    const body = [
      {
        anchorRelative: `01/${gtin}`,
        description: itemDescription,
        links: [
          ...candidateLinks,
          {
            '@linkType': defaultLinkTypeFixed,
            title: defaultTitleFixed,
            href: defaultHref
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
        const batchId = data.batchId || (typeof data.data === 'string' ? data.data : (data.data && data.data.batchId ? data.data.batchId : ''));
        lastBatchId = batchId || '';
        success = batchId
          ? `Solicitud aceptada. ID de lote: ${batchId}. Puedes consultar el estado en /api/feedback.`
          : 'Solicitud aceptada (procesamiento asíncrono).';
        gtin = '';
        itemDescription = '';
        defaultHref = '';
        linksExtra = [];
        descMessage = '';
      } else {
        error = data.error || 'Error al crear el enlace.';
      }
    } catch (e) {
      error = 'Error de red o API.';
    }
    loading = false;
  }
</script>

<div class="p-12 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
  <h1 class="text-3xl font-bold mb-8 text-[#003366]">Crear Enlace</h1>
  <form class="space-y-8" on:submit|preventDefault={createLink} autocomplete="on">
    <div>
      <label for="gtinInput" class="block text-lg font-semibold text-[#003366] mb-2">GTIN
        <span class="ml-1 text-gray-400 cursor-help" title="Código Global de Identificación de Producto">&#9432;</span>
      </label>
      <div class="flex gap-2">
        <input id="gtinInput" type="text" bind:value={gtin} class="flex-1 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Ej: 07433200904022" required autocomplete="on" />
        <button type="button" class="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300" on:click={fetchDescription} disabled={descLoading || !gtin}>
          {#if descLoading}Buscando...{:else}Obtener descripción{/if}
        </button>
      </div>
      {#if descMessage}
        <div class="mt-2 text-sm text-gray-700">{descMessage}</div>
      {/if}
    </div>
    <div>
      <label for="descInput" class="block text-lg font-semibold text-[#003366] mb-2">Descripción del producto
        <span class="ml-1 text-gray-400 cursor-help" title="Se obtiene automáticamente desde el GTIN verificado. No editable.">&#9432;</span>
      </label>
      <input id="descInput" type="text" bind:value={itemDescription} class="w-full border-2 border-gray-300 bg-gray-100 cursor-not-allowed rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Se rellenará desde el GTIN verificado" readonly />
    </div>
    <div class="grid md:grid-cols-1 gap-4">
      <div class="md:col-span-1">
        <label for="defaultHrefInput" class="block text-lg font-semibold text-[#003366] mb-2">URL por defecto (href)</label>
        <input id="defaultHrefInput" type="url" bind:value={defaultHref} class="w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-3 text-lg font-sans transition-all" placeholder="Ej: https://example.com/default" required />
        <div class="mt-1 text-xs text-gray-600">Se usará título "{defaultTitleFixed}" y @linkType "{defaultLinkTypeFixed}" automáticamente.</div>
      </div>
    </div>

    <div class="mt-8">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-[#003366]">Enlaces adicionales</h2>
        <button type="button" class="px-3 py-2 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700" on:click={() => {
          const ni = countries.find(c => c.code?.toUpperCase() === 'NI')?.code || countries[0]?.code || '';
          linksExtra = [...linksExtra, { '@linkType': 'gs1:pip', title: '', href: '', language: 'es', context: ni } ];
        }}>+ Agregar enlace</button>
      </div>
      {#if linksExtra.length === 0}
        <div class="mt-2 text-sm text-gray-600">No hay enlaces adicionales. Usa “Agregar enlace”.</div>
      {/if}
      <div class="mt-3 space-y-4">
        {#each linksExtra as l, i}
          <div class="border rounded p-4 bg-gray-50">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label for={`extra_linkType_${i}`} class="block text-sm font-semibold text-gray-700">@linkType</label>
                <select id={`extra_linkType_${i}`} bind:value={l['@linkType']} class="w-full border rounded px-2 py-2">
                  {#each linkTypes.filter(lt => !hiddenInSelect.has(lt.value)) as lt}
                    <option value={lt.value}>{lt.label}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label for={`extra_title_${i}`} class="block text-sm font-semibold text-gray-700">Título</label>
                <input id={`extra_title_${i}`} type="text" bind:value={l.title} class="w-full border rounded px-2 py-2" />
              </div>
              <div>
                <label for={`extra_href_${i}`} class="block text-sm font-semibold text-gray-700">href</label>
                <input id={`extra_href_${i}`} type="url" bind:value={l.href} class="w-full border rounded px-2 py-2" />
              </div>
              <div>
                <label for={`extra_lang_${i}`} class="block text-sm font-semibold text-gray-700">Idioma</label>
                <select id={`extra_lang_${i}`} bind:value={l.language} class="w-full border rounded px-2 py-2">
                  {#each languages as lang}
                    <option value={lang.code}>{lang.name} ({lang.code})</option>
                  {/each}
                </select>
              </div>
              <div>
                <label for={`extra_ctx_${i}`} class="block text-sm font-semibold text-gray-700">Contexto</label>
                <select id={`extra_ctx_${i}`} bind:value={l.context} class="w-full border rounded px-2 py-2">
                  {#each countries as c}
                    <option value={c.code}>{c.name} ({c.code})</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="mt-3 flex justify-between">
              <button type="button" class="px-3 py-1 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700" on:click={() => linksExtra = linksExtra.filter((_, idx) => idx !== i)}>Eliminar</button>
              <div class="text-xs text-gray-500">Fila #{i + 1}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <button type="submit" class="w-full px-8 py-4 bg-[#003366] text-white rounded-lg font-semibold text-xl transition-colors hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={loading}>
      {#if loading}
        <svg class="animate-spin h-6 w-6 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        Creando...
      {:else}
        Crear enlace
      {/if}
    </button>
    {#if success}
      <div class="bg-green-100 text-green-800 p-4 rounded-lg mt-4 text-lg font-semibold border border-green-300 shadow">{success}</div>
    {/if}
    {#if error}
      <div class="bg-red-100 text-red-800 p-4 rounded-lg mt-4 text-lg font-semibold border border-red-300 shadow">{error}</div>
    {/if}
  </form>
  <div class="mt-6">
    <h2 class="text-xl font-semibold mb-2 text-[#003366]">Consultar estado de solicitud</h2>
  <FeedbackStatus initialBatchId={lastBatchId} />
  </div>
</div>
