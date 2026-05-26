<script>
  import { createEventDispatcher } from 'svelte';

  export let links = [];

  const dispatch = createEventDispatcher();
  let deletingKey = '';
  let deleteError = '';

  // We keep all links (including defaultLink) in this prop but hide defaultLink from the table view.
  // Compute a derived list for rendering only non-default links.
  $: visibleLinks = Array.isArray(links) ? links.filter(l => !isDefaultLink(l['@linkType'])) : [];

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
    } catch {
      return false;
    }
  }

  function linkKey(link) {
    return [
      link.anchorRelative || '',
      link['@linkType'] || '',
      link.href || '',
      Array.isArray(link.hreflang) ? link.hreflang.join('|') : link.hreflang || '',
      Array.isArray(link.context) ? link.context.join('|') : link.context || '',
      link.type || '',
      link.title || ''
    ].join('::');
  }

  async function deleteLink(link) {
    if (!confirm('Eliminar este enlace?')) return;

    deleteError = '';
    deletingKey = linkKey(link);

    try {
      const res = await fetch('/api/delete-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ link })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        deleteError = data.error || 'No se pudo eliminar el enlace.';
        return;
      }

      dispatch('deleted', { link });
    } catch {
      deleteError = 'Error de red o API al eliminar el enlace.';
    } finally {
      deletingKey = '';
    }
  }
</script>
<div class="overflow-x-auto w-full max-h-[520px] border border-gray-200 rounded-lg relative table-header-sticky">
  <table class="w-full text-sm table-zebra">
    <thead class="gs1-table-head uppercase text-[11px] tracking-wide">
      <tr>
        <th class="px-3 py-2 text-left sticky top-0 gs1-table-head">Tipo</th>
        <th class="px-3 py-2 text-left sticky top-0 gs1-table-head">Titulo</th>
        <th class="px-3 py-2 text-left sticky top-0 gs1-table-head">Idioma</th>
        <th class="px-3 py-2 text-left sticky top-0 gs1-table-head">Pais</th>
        <th class="px-3 py-2 text-left sticky top-0 gs1-table-head w-[500px]">URL</th>
        <th class="px-3 py-2 text-center sticky top-0 gs1-table-head w-16">Accion</th>
      </tr>
    </thead>
    <tbody class="align-top">
  {#each visibleLinks as link (linkKey(link))}
        <tr class="border-t border-gray-200 gs1-table-hover transition-colors">
          <td class="px-3 py-1.5 text-sm text-gray-700">{link['@linkType'] || ''}</td>
          <td class="px-3 py-1.5">
            {link.title || ''}
            {#if isSameAsDefaultHref(link)}
              <span class="ml-2 inline-block text-[10px] uppercase tracking-wide bg-[var(--gs1-ui-2)] text-[var(--gs1-blue)] px-2 py-0.5 rounded border border-[var(--gs1-ui-3)]" title="Este enlace apunta a la misma URL que el enlace por defecto oculto.">DEFAULT</span>
            {/if}
          </td>
          <td class="px-3 py-1.5 text-gray-600">{Array.isArray(link.hreflang) ? link.hreflang.join(', ') : (link.hreflang || '')}</td>
          <td class="px-3 py-1.5 text-gray-600">{Array.isArray(link.context) ? link.context.join(', ') : (link.context || '')}</td>
          <td class="px-3 py-1.5 w-[380px]" style="word-break:break-all; max-width:380px;"><a href={link.href} target="_blank" class="text-[var(--gs1-link-accessible)] hover:underline break-words">{link.href}</a></td>
          <td class="px-3 py-1.5 text-center">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Eliminar enlace"
              aria-label="Eliminar enlace"
              disabled={deletingKey === linkKey(link)}
              on:click={() => deleteLink(link)}
            >
              {#if deletingKey === linkKey(link)}
                <span class="text-[10px] font-semibold">...</span>
              {:else}
                <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5" />
                  <path d="M14 11v5" />
                </svg>
              {/if}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if deleteError}
  <div class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>
{/if}
