<script>
  import { onMount } from 'svelte';

  let loading = true;
  let error = '';
  let logs = [];
  let totalEmpresas = 0;
  let totalProducts = 0;
  let domainBreakdown = [];

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${min}`;
  }

  onMount(async () => {
    try {
      const res = await fetch('/api/reportes');
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        error = data.error || 'No se pudo cargar la informacion.';
        loading = false;
        return;
      }

      logs = Array.isArray(data.logs) ? data.logs : [];
      totalEmpresas = data.summary?.totalEmpresas || 0;
      totalProducts = data.summary?.totalProducts || 0;
      domainBreakdown = Array.isArray(data.summary?.domainBreakdown) ? data.summary.domainBreakdown : [];
      error = '';
    } catch (_) {
      error = 'No se pudo cargar la informacion.';
    }
    loading = false;
  });
</script>

<main class="gs1-page">
  <section class="gs1-page-shell">
    <div class="mb-6">
      <h1 class="text-3xl gs1-page-title tracking-tight">Reportes</h1>
      <p class="mt-2 gs1-page-subtitle">Resumen de empresas, productos y registros generados.</p>
    </div>

    {#if loading}
      <div class="gs1-card p-5 text-gray-600">Cargando reportes...</div>
    {:else if error}
      <div class="gs1-error-banner">{error}</div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="gs1-card p-5">
          <div class="text-xs uppercase tracking-wide text-gray-500">Empresas</div>
          <div class="mt-2 text-3xl font-bold text-[var(--gs1-blue)]">{totalEmpresas}</div>
        </div>

        <div class="gs1-card p-5">
          <div class="text-xs uppercase tracking-wide text-gray-500">Total Products</div>
          <div class="mt-2 text-3xl font-bold text-[var(--gs1-blue)]">{totalProducts}</div>
        </div>

        {#each domainBreakdown as domain}
          <div class="gs1-card p-5">
            <div class="text-xs uppercase tracking-wide text-gray-500 truncate" title={domain.qr_domain}>
              {domain.qr_domain || '-'}
            </div>
            <div class="mt-2 text-3xl font-bold text-[var(--gs1-blue)]">{domain.total}</div>
          </div>
        {/each}
      </div>

      <div class="gs1-card overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg gs1-card-title">Log de Generacion QR</h2>
          <span class="text-sm text-gray-500">{logs.length} registros</span>
        </div>

        <div class="overflow-x-auto max-h-[680px]">
          <table class="w-max min-w-full text-sm">
            <thead class="gs1-table-head uppercase text-[11px] tracking-wide sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left whitespace-nowrap">Empresa</th>
                <th class="px-3 py-2 text-left">GTIN</th>
                <th class="px-3 py-2 text-left">Producto</th>
                <th class="px-3 py-2 text-left">CONTENIDO QR</th>
                <th class="px-3 py-2 pr-6 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {#each logs as row}
                <tr class="border-t border-gray-200 gs1-table-hover">
                  <td class="px-3 py-2 whitespace-nowrap">{row.licensee_name || '-'}</td>
                  <td class="px-3 py-2">{row.gtin || '-'}</td>
                  <td class="px-3 py-2">{row.product_description || '-'}</td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    {#if row.qr_content}
                      <a href={row.qr_content} target="_blank" rel="noopener noreferrer" class="text-[var(--gs1-link-accessible)] hover:underline">{row.qr_content}</a>
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class="px-3 py-2 pr-6 whitespace-nowrap">{formatDate(row.generated_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </section>
</main>
