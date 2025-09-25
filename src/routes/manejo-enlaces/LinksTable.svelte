<script>
  import { createEventDispatcher } from 'svelte';
  export let gtin = '';
  export let links = [];
  // We keep all links (including defaultLink) in this prop but hide defaultLink from the table view.
  // Compute a derived list for rendering only non-default links.
  $: visibleLinks = Array.isArray(links) ? links.filter(l => !isDefaultLink(l['@linkType'])) : [];
  const dispatch = createEventDispatcher();
  let deleteLoading = false;
  let deleteError = '';
  let deleteSuccess = '';
  let lastBatchId = '';
  function isDefaultLink(linkType) {
    return linkType === 'gs1:defaultLink' || linkType === 'https://ref.gs1.org/voc/defaultLink';
  }
  // Extract the hidden default link (if any) to capture its canonical href for identification.
  $: defaultLink = Array.isArray(links) ? links.find(l => isDefaultLink(l['@linkType'])) : undefined;
  $: defaultHref = defaultLink?.href || '';
  // Determine which visible link shares the same href as the hidden default (if any)
  // This allows us to badge it as effectively the default destination.
  function isSameAsDefaultHref(link) {
    if (!defaultHref || !link) return false;
    try {
      // Normalize minor trailing slashes for comparison
      const norm = (u) => (u || '').trim().replace(/\/$/, '');
      return norm(link.href) === norm(defaultHref);
    } catch (_) {
      return false;
    }
  }
  async function deleteLink(link) {
    if (!gtin || !link) return;
    if (isDefaultLink(link['@linkType'])) return;
    if (!confirm('¿Eliminar este enlace específico?')) return;
    deleteLoading = true;
    deleteError = '';
    deleteSuccess = '';
    const payload = [
      {
        anchorRelative: link.anchorRelative || `01/${gtin}`,
        links: [
          {
            '@linkType': link['@linkType'],
            href: link.href,
            hreflang: link.hreflang,
            context: link.context,
            type: link.type,
            title: link.title
          }
        ]
      }
    ];
    try {
      const res = await fetch('/api/delete-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        deleteSuccess = 'Enlace eliminado exitosamente.';
        lastBatchId = data.batchId || '';
        dispatch('deleted', { links: links.filter(l => l !== link) });
        dispatch('batch', { batchId: lastBatchId });
      } else {
        deleteError = data.error || 'No se pudo eliminar el enlace.';
        dispatch('error', { error: deleteError });
      }
    } catch (e) {
      deleteError = 'Error de red o API.';
      dispatch('error', { error: deleteError });
    }
    deleteLoading = false;
  }
  async function deleteAllLinks() {
    if (!gtin) return;
    if (!confirm('¿Eliminar TODOS los enlaces de este GTIN? Esto incluye el enlace por defecto.')) return;
    deleteLoading = true;
    deleteError = '';
    deleteSuccess = '';
    const payload = [ { anchorRelative: `01/${gtin}` } ];
    try {
      const res = await fetch('/api/delete-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        deleteSuccess = 'Todos los enlaces fueron eliminados exitosamente.';
        lastBatchId = data.batchId || '';
        dispatch('deleted', { links: [] });
        dispatch('batch', { batchId: lastBatchId });
      } else {
        deleteError = data.error || 'No se pudieron eliminar los enlaces.';
        dispatch('error', { error: deleteError });
      }
    } catch (e) {
      deleteError = 'Error de red o API.';
      dispatch('error', { error: deleteError });
    }
    deleteLoading = false;
  }
  // Expose a public method so parent can trigger deletion from its header
  export function deleteAll() {
    return deleteAllLinks();
  }
</script>
<div class="overflow-x-auto w-full max-h-[520px] border border-gray-200 rounded-lg relative table-header-sticky">
  <table class="w-full text-sm table-zebra">
    <thead class="bg-gray-100 text-gray-700 uppercase text-[11px] tracking-wide">
      <tr>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100">Tipo</th>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100">Título</th>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100">Idioma</th>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100">País</th>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100 w-[500px]">URL</th>
        <th class="px-3 py-2 text-left sticky top-0 bg-gray-100">Acciones</th>
      </tr>
    </thead>
    <tbody class="align-top">
  {#each visibleLinks as link}
        <tr class="border-t border-gray-200 hover:bg-blue-50/40 transition-colors">
          <td class="px-3 py-1.5 text-sm text-gray-700">{link['@linkType'] || ''}</td>
          <td class="px-3 py-1.5">
            {link.title || ''}
            {#if isSameAsDefaultHref(link)}
              <span class="ml-2 inline-block text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-300" title="Este enlace apunta a la misma URL que el enlace por defecto oculto.">DEFAULT</span>
            {/if}
          </td>
          <td class="px-3 py-1.5 text-gray-600">{Array.isArray(link.hreflang) ? link.hreflang.join(', ') : (link.hreflang || '')}</td>
          <td class="px-3 py-1.5 text-gray-600">{Array.isArray(link.context) ? link.context.join(', ') : (link.context || '')}</td>
          <td class="px-3 py-1.5 w-[380px]" style="word-break:break-all; max-width:380px;"><a href={link.href} target="_blank" class="text-blue-600 hover:underline break-words">{link.href}</a></td>
          <td class="px-3 py-1.5">
            {#if !isDefaultLink(link['@linkType'])}
              <button
                type="button"
                class="btn btn-danger-outline disabled:opacity-60"
                on:click={() => deleteLink(link)}
                disabled={deleteLoading || isSameAsDefaultHref(link)}
                title={isSameAsDefaultHref(link) ? 'No se puede eliminar: coincide con la URL del enlace por defecto.' : 'Eliminar este enlace'}>
                {#if deleteLoading}
                  <svg class="animate-spin h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                {:else}
                  {isSameAsDefaultHref(link) ? 'Bloqueado' : 'Eliminar'}
                {/if}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if deleteError}
  <div class="bg-red-100 text-red-800 p-3 rounded-lg mt-2 text-base font-semibold border border-red-300 shadow">{deleteError}</div>
{/if}
{#if deleteSuccess}
  <div class="bg-green-100 text-green-800 p-3 rounded-lg mt-2 text-base font-semibold border border-green-300 shadow">{deleteSuccess}</div>
{/if}
