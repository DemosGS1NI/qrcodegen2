<script>
  import { createEventDispatcher, onMount } from 'svelte';
  export let gtin = '';
  export let description = '';
  export let links = [];
  const dispatch = createEventDispatcher();
  let linksExtra = [];
  let linkTypes = [];
  let countries = [];
  let languages = [];
  let loading = false;
  let error = '';
  let prevGtin = '';
  const restrictedLinkTypes = new Set(['gs1:eifu','gs1:epil','gs1:smpc','gs1:handledBy']);
  const hiddenInSelect = new Set([...restrictedLinkTypes, 'gs1:defaultLink', 'https://ref.gs1.org/voc/defaultLink', 'gs1:defaultLinkMulti']);
  const defaultTitleFixed = 'Default Product Info';
  // We default to CURIE form (gs1:xxx). Requirement: if first time creating links, always send CURIE.
  // On subsequent modifications, if the previously retrieved links used full IRIs (https://ref.gs1.org/voc/xxx),
  // we mirror that representation and send full IRIs back to the API.
  const defaultLinkTypeCurie = 'gs1:defaultLink';
  const defaultLinkTypeFull = 'https://ref.gs1.org/voc/defaultLink';
  onMount(async () => {
    const res = await fetch('/gs1-linktypes.json');
    linkTypes = await res.json();
    const resCountries = await fetch('/countries.json');
    countries = await resCountries.json();
    const resLanguages = await fetch('/languages.json');
    languages = await resLanguages.json();
  });
  // Do not auto-populate forms from existing links. We keep the editor empty by default
  // so users explicitly add new links via "+ Agregar enlace" when a GTIN already has links.
  function addExtraLink() {
    const ni = countries.find(c => c.code?.toUpperCase() === 'NI')?.code || countries[0]?.code || '';
    linksExtra = [...linksExtra, { '@linkType': 'gs1:pip', title: '', href: '', language: 'es', context: ni, type: 'text/html' }];
  }
  function removeExtraLink(i) {
    linksExtra = linksExtra.filter((_, idx) => idx !== i);
  }
  function cancelEditing() {
    linksExtra = [];
    error = '';
  }
  // Expose actions so parent can render buttons in header
  export function add() { return addExtraLink(); }
  export function cancel() { return cancelEditing(); }
  export function hasRows() { return Array.isArray(linksExtra) && linksExtra.length > 0; }
  // When GTIN changes, reset the editor state so it behaves like a fresh start
  $: if (gtin !== prevGtin) {
    linksExtra = [];
    error = '';
    prevGtin = gtin;
  }
  async function updateLinks() {
    error = '';
    loading = true;
    if (!linksExtra || linksExtra.length === 0) {
      error = 'Agrega al menos un enlace antes de guardar.';
      loading = false;
      return;
    }
    // Validate all links
    for (const l of linksExtra) {
      if (!l['@linkType'] || restrictedLinkTypes.has(l['@linkType'])) {
        error = 'Tipo de enlace inválido o restringido.';
        loading = false;
        return;
      }
      if (!l.title || !l.href || !l.language || !l.context) {
        error = 'Todos los campos de los enlaces son obligatorios.';
        loading = false;
        return;
      }
    }
  // Map user-entered links (new additions only)
    const toFull = (t) => t && t.startsWith('gs1:') ? `https://ref.gs1.org/voc/${t.slice(4)}` : t;
    const toCurie = (t) => t && t.startsWith('https://ref.gs1.org/voc/') ? `gs1:${t.split('/').pop()}` : t;
    const hadExistingLinks = Array.isArray(links) && links.length > 0;
    const existingHasFull = hadExistingLinks && links.some(l => typeof l['@linkType'] === 'string' && l['@linkType'].startsWith('https://ref.gs1.org/voc/'));
    // Decide representation strategy:
    //  - If no existing links: force CURIE
    //  - If existing set contains any full IRI: use full
    //  - Else keep CURIE
    const representation = (!hadExistingLinks) ? 'curie' : (existingHasFull ? 'full' : 'curie');

    // Helper to normalize an existing link from the fetched "links" prop into canonical structure we send.
    function normalizeExisting(l) {
      if (!l) return l;
      const href = l.href;
      const title = l.title;
      const type = l.type || 'text/html';
      // Ensure arrays
      const hreflang = Array.isArray(l.hreflang) ? l.hreflang : (l.hreflang ? [l.hreflang] : []);
      const context = Array.isArray(l.context) ? l.context.map(c => String(c).toLowerCase()) : (l.context ? [String(l.context).toLowerCase()] : []);
      let lt = l['@linkType'];
      if (representation === 'full') lt = toFull(lt);
      else lt = toCurie(lt);
      return {
        '@linkType': lt,
        href,
        title,
        type,
        ...(hreflang.length ? { hreflang } : {}),
        ...(context.length ? { context } : {})
      };
    }
    // Normalize existing links (non-default first)
    let existingDefault = null;
    let existingNonDefault = [];
    if (hadExistingLinks) {
      for (const l of links) {
        const isDef = l['@linkType'] === defaultLinkTypeCurie || l['@linkType'] === defaultLinkTypeFull || l['@linkType'] === 'gs1:defaultLink' || l['@linkType'] === 'https://ref.gs1.org/voc/defaultLink';
        if (isDef && !existingDefault) existingDefault = normalizeExisting(l);
        else if (!isDef) existingNonDefault.push(normalizeExisting(l));
      }
    }
    // Map new links
    let newLinksNormalized = linksExtra.map(l => ({
      '@linkType': l['@linkType'],
      href: l.href,
      title: l.title,
      type: l.type || 'text/html',
      hreflang: [l.language],
      context: [String(l.context).toLowerCase()]
    }));
    // Representation normalization for new links
    if (representation === 'full') {
      for (const l of newLinksNormalized) l['@linkType'] = toFull(l['@linkType']);
    } else {
      for (const l of newLinksNormalized) l['@linkType'] = toCurie(l['@linkType']);
    }
    // Merge existing non-default + new links
    let merged = [...existingNonDefault, ...newLinksNormalized];
    // De-duplicate by composite key
    const seen = new Set();
    merged = merged.filter(l => {
      const hre = Array.isArray(l.hreflang) ? l.hreflang.join(',') : '';
      const ctx = Array.isArray(l.context) ? l.context.join(',') : '';
      const key = `${l['@linkType']}|${l.href}|${hre}|${ctx}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Determine / create default link.
    if (!existingDefault) {
      // First creation scenario OR somehow default missing: pick first merged link href as target (prefer pip if present)
      let base = merged.find(l => (l['@linkType'] === 'gs1:pip' || l['@linkType'] === 'https://ref.gs1.org/voc/pip')) || merged[0];
      if (base) {
        existingDefault = {
          '@linkType': representation === 'full' ? defaultLinkTypeFull : defaultLinkTypeCurie,
          href: base.href,
          title: 'Default Link'
        };
      }
    } else {
      // Make sure default link representation matches chosen representation
      existingDefault['@linkType'] = representation === 'full' ? defaultLinkTypeFull : defaultLinkTypeCurie;
    }
    // Ensure default link is last and not duplicated among merged
    if (existingDefault) {
      // Remove any accidental default entries inside merged
      merged = merged.filter(l => !(l['@linkType'] === defaultLinkTypeCurie || l['@linkType'] === defaultLinkTypeFull));
      // Remove any merged link identical to default (same href & linkType & title) to avoid dup noise
      merged = merged.filter(l => !(l.href === existingDefault.href && l['@linkType'] === existingDefault['@linkType']));
    }
    const finalLinks = existingDefault ? [...merged, existingDefault] : merged;
    // If after all this we still have zero links (unlikely), abort
    if (finalLinks.length === 0) {
      error = 'No hay enlaces para enviar después de la fusión.';
      loading = false;
      return;
    }
    const allLinks = finalLinks; // keep variable name used below for logging & dispatch
    const body = [ { anchorRelative: `01/${gtin}`, description, links: allLinks } ];
    console.log('LinkEditor submitting links payload:', JSON.stringify(allLinks, null, 2));
    try {
      const res = await fetch('/api/update-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        dispatch('updated', { links: allLinks });
        dispatch('batch', { batchId: data.batchId || '' });
        // Clear editor rows after successful submission to enforce sequential add
        linksExtra = [];
      } else {
        error = data.error || 'Error al crear/modificar los enlaces.';
        dispatch('error', { error });
      }
    } catch (e) {
      error = 'Error de red o API.';
      dispatch('error', { error });
    }
    loading = false;
  }
  // Derived validity: at least one link with all required fields and non-restricted type
  $: hasValidNewLink = Array.isArray(linksExtra) && linksExtra.some(l => {
    if (!l) return false;
    if (!l['@linkType'] || restrictedLinkTypes.has(l['@linkType'])) return false;
    if (!l.title || !l.href || !l.language || !l.context) return false;
    // minimal URL sanity: starts with http or https
    if (!/^https?:\/\//i.test(l.href)) return false;
    return true;
  });
</script>
<div class="">
  <h2 class="sr-only">Agregar enlaces</h2>
  <!-- Default link section removed: all links are now managed in a unified way below -->
  <div class="mt-6">
          {#if linksExtra.length === 0}
            {#if !(Array.isArray(links) && links.length > 0)}
              <div class="mt-2 text-sm text-gray-600">No hay enlaces todavía. Usa “Agregar enlace” para crear el primero. Este se convertira en el link default</div>
            {/if}
          {:else}
            <div class="mt-3 space-y-4">
              {#each linksExtra as l, i}
                <div class="relative pb-3 mb-3 border-b border-gray-200">
                  
                  <div class="grid grid-cols-1 md:[grid-template-columns:minmax(230px,230px)_minmax(120px,120px)_minmax(124px,124px)_minmax(250px,300px)_minmax(300px,700px)] gap-4 items-start text-sm">
                    <div>
                      <label class="block text-sm font-semibold text-gray-700" for={`lt-${i}`}>Link Type</label>
                      <select id={`lt-${i}`} bind:value={l['@linkType']} class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 text-sm w-full">
                        {#each linkTypes.filter(lt => !hiddenInSelect.has(lt.value)) as lt}
                          <option value={lt.value}>{lt.label}</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-gray-700" for={`lang-${i}`}>Idioma</label>
                      <select id={`lang-${i}`} bind:value={l.language} class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 text-sm w-full">
                        {#each languages as lang}
                          <option value={lang.code}>{lang.name} ({lang.code})</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-gray-700" for={`ctx-${i}`}>Contexto</label>
                      <select id={`ctx-${i}`} bind:value={l.context} class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 text-sm w-full">
                        {#each countries as c}
                          <option value={c.code}>{c.name} ({c.code})</option>
                        {/each}
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-gray-700" for={`title-${i}`}>Título</label>
                      <input id={`title-${i}`} type="text" bind:value={l.title} class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 text-sm w-full" />
                    </div>
                    <div>
                      <label class="text-sm font-semibold text-gray-700 flex items-center justify-between" for={`href-${i}`}>
                        <span>URL</span>
                      </label>
                      <input id={`href-${i}`} type="url" bind:value={l.href} class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 text-sm" />
                      
                    </div>
                  </div>
                  <div class="mt-3 text-xs text-gray-500 flex items-center justify-between">
                    <span></span>
                    {#if linksExtra.length > 1}
                      <button type="button" class="text-red-600 hover:underline" on:click={() => removeExtraLink(i)}>Quitar</button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
  </div>
  <div class="mt-6 border-t pt-4 flex justify-center">
  <button type="button" class="btn btn-primary" on:click={updateLinks} disabled={loading || !hasValidNewLink}>
      {#if loading}
        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        Guardando...
      {:else}
        Actualizar
      {/if}
    </button>
  </div>
  {#if error}
    <div class="bg-red-100 text-red-800 p-4 rounded-lg mt-4 text-lg font-semibold border border-red-300 shadow">{error}</div>
  {/if}
</div>
