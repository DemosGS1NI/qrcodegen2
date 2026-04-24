<script>
  import DirectricesDisenoQr from '$lib/informacion/DirectricesDisenoQr.svelte';
  import InstruccionesUsoGenerador from '$lib/informacion/InstruccionesUsoGenerador.svelte';

  const entries = [
    {
      id: 'directrices-diseno-qr',
      title: 'Directrices de diseno para Codigos QR con el estandar GS1 Digital Link',
      component: DirectricesDisenoQr
    },
    {
      id: 'instrucciones-uso-generador',
      title: 'Instrucciones de Uso del generador de QRs',
      component: InstruccionesUsoGenerador
    }
  ];
</script>

<main class="gs1-page">
  <section class="gs1-page-shell max-w-[1200px]">
    <div class="mb-6">
      <h1 class="text-3xl gs1-page-title tracking-tight">Informacion</h1>
      <p class="mt-2 gs1-page-subtitle">Entradas tipo foro con contenido compacto y expandible.</p>
    </div>

    <div class="space-y-4">
      {#each entries as entry, idx}
        <details class="group gs1-card overflow-hidden">
          <summary class="cursor-pointer list-none px-5 py-4 flex items-center justify-between select-none">
            <span class="text-base md:text-lg font-semibold text-[var(--gs1-blue)]">{entry.title}</span>
            <span class="text-gray-500 text-sm group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div class="border-t border-gray-100 px-5 py-4 max-h-[60vh] overflow-y-auto">
            <svelte:component this={entry.component} />
          </div>
        </details>
      {/each}
    </div>
  </section>
</main>
