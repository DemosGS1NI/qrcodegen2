<script>
  export let links = [];
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
    } catch (_) {
      return false;
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
      </tr>
    </thead>
    <tbody class="align-top">
  {#each visibleLinks as link}
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
        </tr>
      {/each}
    </tbody>
  </table>
</div>
