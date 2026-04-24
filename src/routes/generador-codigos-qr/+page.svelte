<script>
   import * as XLSX from 'xlsx';
   import JSZip from 'jszip';
   import QRCode from 'qrcode-svg';

    // Domain options for QR encoding
    const DOMAIN_OPTIONS = [
      'https://id.gs1.org/',
      'https://qr.2dgs1ni.com/',
     
    ];
    let selectedDomain = DOMAIN_OPTIONS[0];

let gtinList = [];
let error = '';
let fileInput;
let showGtinText = false;
let qrConfigSummary = [];
let manualGtin = '';
let manualLoading = false;

// GS1 x-dimension target: 0.495 mm
const MM_TO_PX = 3.7795;
let moduleSizeMm = 0.99; // default to 2x GS1
let moduleSizePx = moduleSizeMm * MM_TO_PX;

    function normalizeGtin(value) {
      const digits = String(value || '').replace(/\D/g, '');
      if (digits.length === 13) return `0${digits}`;
      return digits;
    }
  
  
    async function handleFileUpload(event) {
      const file = event.target.files?.[0];

      const MAX_BYTES = 4 * 1024 * 1024; // 4 MB limit
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream'
      ];

      if (!file) return;

      // Enforce size limit
      if (file.size > MAX_BYTES) {
        error = 'Archivo demasiado grande (máx 4 MB).';
        return;
      }

      // Basic MIME and extension check
      if (!allowedTypes.includes(file.type) && !/\.xlsx?$/i.test(file.name)) {
        error = 'Tipo de archivo no soportado. Use .xlsx/.xls';
        return;
      }

      try {
        const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Use range that includes column F (index 5)
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'B3:F1000');
          range.s.c = 1; // Start column B (index 1)
          range.s.r = 2; // Start from row 3 (index 2)
          range.e.c = 5; // End column F (index 5)
          
          const products = [];
          for (let R = range.s.r; R <= range.e.r; R++) {
            const gtinCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 1 })]; // Column B
            const descCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 5 })]; // Column F
            
            if (gtinCell && gtinCell.v) {
              const gtin = gtinCell.v.toString().trim();
              // Get description if available, or use empty string
              const description = (descCell && descCell.v) ? descCell.v.toString().trim() : '';
              
              if (gtin) {
                products.push({ gtin, description, source: 'file', licenseeName: '' });
              }
            }
          }
          
          if (products.length === 0) {
            throw new Error('No se encontraron GTINs en la columna B');
          }
          
      gtinList = products;
          error = '';
        } catch (err) {
          error = err.message || 'Error al procesar el archivo';
          console.error(err);
        }
      }
    
  
    function sanitizeFilename(name) {
      // Replace invalid filename characters with underscore
      return name.replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .substring(0, 100); // Limit filename length
    }

    async function logQrGeneration(products) {
      try {
        await fetch('/api/log-qr-generation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: products.map((p) => ({
              gtin: p.gtin,
              description: p.description || '',
              source: p.source || 'file',
              qrContent: p.qrContent || ''
            })),
            config: {
              selectedDomain,
              moduleSizeMm,
              showGtinText
            }
          })
        });
      } catch (_) {
        // Logging failures must not block QR delivery.
      }
    }
  
    // In generateQRCodes, use domain without trailing slash to avoid double slashes
    async function generateQRCodes() {
      if (gtinList.length === 0) {
        error = 'Por favor, cargue la lista de GTINs';
        return;
      }

      try {
        const zip = new JSZip();
        // Reset config info for summary
        qrConfigSummary = [];
        const generatedItems = [];
        gtinList.forEach(product => {
          // Remove trailing slash if present
          const domain = selectedDomain.endsWith('/') ? selectedDomain.slice(0, -1) : selectedDomain;
          const qrContent = `${domain}/01/${product.gtin}`;
          // Use user-selected module size
          const moduleSizePx = parseFloat(moduleSizeMm) * MM_TO_PX;
          // Create a temporary QR to get module count
          const tempQR = new QRCode({
            content: qrContent,
            padding: 4,
            width: 256,
            height: 256,
            color: '#000000',
            background: '#ffffff',
            ecl: 'M'
          });
          // Get module count from tempQR
          const moduleCount = tempQR._qr ? tempQR._qr.moduleCount : 21; // fallback to 21 (version 1)
          const quietZoneModules = 4;
          // Calculate required QR size so each module is exactly moduleSizePx
          const totalModules = moduleCount + 2 * quietZoneModules;
          const qrPixelSize = totalModules * moduleSizePx;
          // Set QR options (still in px for QRCode)
          const qrOptions = {
            content: qrContent,
            padding: quietZoneModules,
            width: qrPixelSize,
            height: qrPixelSize,
            color: '#000000',
            background: '#ffffff',
            ecl: 'M'
          };
          const qr = new QRCode(qrOptions);

          let svg = qr.svg();
          // Always add trademark and GTIN text in one SVG DOM
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');
          const svgElem = doc.documentElement;
          // Convert px to mm for SVG output
          const qrWidthPx = parseFloat(svgElem.getAttribute('width'));
          const qrHeightPx = parseFloat(svgElem.getAttribute('height'));
          const qrWidthMm = (qrWidthPx / MM_TO_PX).toFixed(3);
          const qrHeightMm = (qrHeightPx / MM_TO_PX).toFixed(3);
          svgElem.setAttribute('width', `${qrWidthMm}mm`);
          svgElem.setAttribute('height', `${qrHeightMm}mm`);
          svgElem.setAttribute('viewBox', `0 0 ${qrWidthPx} ${qrHeightPx}`);
          // Find smallest <rect> width to get module size
          const rects = doc.querySelectorAll('rect');
          // padding in modules (from QRCode config)
          const paddingModules = qrOptions.padding;
          const drawableWidth = moduleCount * moduleSizePx;
          // No text above the QR code (GS1/trademark removed)
          // No height increase or shifting needed
          // --- Add GTIN text below QR if enabled ---
          if (showGtinText) {
            // Scale GTIN font size to module size (2.2x module)
            let fontSize = Math.max(10, Math.round(moduleSizePx * 2.2));
            const minFontSize = 10;
            const text = `(01) ${product.gtin}`;
            // Use canvas to measure text width
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.font = `${fontSize}px Arial`;
            let textWidth = ctx.measureText(text).width;
            while (textWidth > drawableWidth && fontSize > minFontSize) {
              fontSize--;
              ctx.font = `${fontSize}px Arial`;
              textWidth = ctx.measureText(text).width;
            }
            const textHeight = fontSize + 6; // add a little extra for descenders
            let newHeightPx = qrHeightPx + textHeight;
            let newHeightMm = (newHeightPx / MM_TO_PX).toFixed(3);
            svgElem.setAttribute('height', `${newHeightMm}mm`);
            svgElem.setAttribute('viewBox', `0 0 ${qrWidthPx} ${newHeightPx}`);
            // Add text element, centered, right below QR, not truncated
            const textElem = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElem.setAttribute('x', qrWidthPx / 2);
            // Move text up so it's closer to QR and fully visible
            textElem.setAttribute('y', qrHeightPx + fontSize * 0.05);
            textElem.setAttribute('text-anchor', 'middle');
            textElem.setAttribute('font-size', String(fontSize));
            textElem.setAttribute('fill', '#000');
            textElem.setAttribute('font-family', 'Arial, sans-serif');
            textElem.setAttribute('width', qrWidthPx);
            textElem.setAttribute('dominant-baseline', 'hanging');
            textElem.textContent = text;
            svgElem.appendChild(textElem);
          }
          svg = new XMLSerializer().serializeToString(svgElem);

          // Create filename with GTIN and description
          let filename = product.gtin;
          if (product.description) {
            filename += '_' + sanitizeFilename(product.description);
          }

          zip.file(`${filename}.svg`, svg);

          generatedItems.push({
            gtin: product.gtin,
            description: product.description || '',
            source: product.source || 'file',
            qrContent
          });

          // Collect config info for summary display
          qrConfigSummary.push({
            gtin: product.gtin,
            description: product.description,
            content: qrOptions.content,
            encodingMode: 'Byte', // qrcode-svg always uses Byte mode
            symbolStructure: 'Model 2', // qrcode-svg uses QR Model 2
            moduleSizePx: moduleSizePx,
            moduleSizeMm: moduleSizeMm,
            version: qr._qr && qr._qr.version ? qr._qr.version : '-',
            errorCorrectionLevel: qrOptions.ecl,
            quietZoneModules: qrOptions.padding,
            quietZonePx: (qrOptions.padding * moduleSizePx).toFixed(2)
          });
        });

        // No need to store on window, Svelte will reactively update

        const content = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'codigos-qr.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await logQrGeneration(generatedItems);
        error = '';
      } catch (err) {
        error = 'Error al generar los códigos QR';
        console.error(err);
      }
    }

    async function addManualGtin() {
      const gtin = normalizeGtin(manualGtin);
      if (!gtin) {
        error = 'Ingrese un GTIN válido.';
        return;
      }
      manualGtin = gtin;

      // prevent duplicates in the current upload list
      if (gtinList.some(p => p.gtin === gtin)) {
        error = 'GTIN ya agregado a la lista.';
        return;
      }

      manualLoading = true;
      error = '';

      try {
        // 1. verify GTIN and get product description
        const descRes = await fetch('/api/get-gtin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gtin })
        });
        const descData = await descRes.json().catch(() => ({}));

        if (!descRes.ok) {
          error = descData.error || descData.message || 'Error de red o API.';
          manualLoading = false;
          return;
        }

        const invalid = !descData.success || descData.errorCode || descData.errorMessage || (Array.isArray(descData) && descData[0]?.validationErrors);
        if (invalid) {
          const code = descData.errorCode || (Array.isArray(descData) && descData[0]?.validationErrors?.[0]?.errors?.[0]?.errorCode) || '';
          const msg = descData.errorMessage || (Array.isArray(descData) && descData[0]?.validationErrors?.[0]?.errors?.[0]?.message) || '';
          if (code === 'E039') {
            error = 'GTIN no reconocido como soportado para cadenas globales abiertas';
          } else {
            error = 'El GTIN no existe en el registry';
          }
          console.debug('get-gtin validation', code, msg, descData);
          manualLoading = false;
          return;
        }

        // extract description from GTIN result
        let productDesc = '';
        if (descData.productDescription) {
          if (typeof descData.productDescription === 'string') productDesc = descData.productDescription;
          else if (Array.isArray(descData.productDescription) && descData.productDescription[0]) productDesc = descData.productDescription[0].value || descData.productDescription[0];
        }
        if (!productDesc && descData.productDescriptionText) productDesc = descData.productDescriptionText;
        if (!productDesc && descData.productName) productDesc = descData.productName;

        // 2. if still no description, try query-links for a fallback
        if (!productDesc) {
          try {
            const linksRes = await fetch('/api/query-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gtin })
            });
            const linksData = await linksRes.json().catch(() => ({}));
            if (linksRes.ok && linksData.success) {
              productDesc = linksData.description || (Array.isArray(linksData) && linksData[0]?.description) || '';
            }
          } catch (e) {
            // ignore link errors for the sake of adding the GTIN, we already validated GTIN exists
            console.debug('query-links failed', e);
          }
        }

  const finalDesc = productDesc || '';
  const finalLicenseeName = typeof descData.licenseeName === 'string' ? descData.licenseeName : '';
  gtinList = [...gtinList, { gtin, description: finalDesc, source: 'manual', licenseeName: finalLicenseeName }];
  manualGtin = '';
        error = '';
      } catch (err) {
        console.error(err);
        error = 'Error al validar el GTIN.';
      } finally {
        manualLoading = false;
      }
    }
</script>
  
<main class="gs1-page w-full">
  <section class="gs1-page-shell w-full">
    <div class="mb-4">
      <h1 class="text-3xl gs1-page-title tracking-tight">Generador de Codigos QR</h1>
      <p class="mt-2 gs1-page-subtitle">Genera codigos QR con estandar GS1 Digital Link</p>
    </div>
    <div class="w-full">
      <div class="gs1-card p-4 md:p-5 space-y-4">
          <div class="rounded-lg border border-[var(--gs1-ui-4)] bg-[var(--gs1-ui-1)]/50 p-3">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-2 items-end">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-gray-600" for="fileInput">Excel</label>
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    class="btn btn-primary btn-md"
                    on:click={() => fileInput.click()}
                    tabindex="0"
                    type="button"
                  >
                    Seleccionar archivo
                  </button>
                  <input
                    bind:this={fileInput}
                    id="fileInput"
                    type="file"
                    accept=".xlsx,.xls"
                    on:change={handleFileUpload}
                    class="hidden"
                  />
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-semibold text-gray-600" for="manualGtin">Manual</label>
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    id="manualGtin"
                    type="text"
                    bind:value={manualGtin}
                    placeholder="GTIN"
                    class="border rounded px-2 py-1 text-sm w-40"
                  />
                  <button
                    class="btn btn-primary btn-md"
                    on:click={addManualGtin}
                    type="button"
                    disabled={manualLoading}
                  >
                    {#if manualLoading}
                      Buscando...
                    {:else}
                      Agregar
                    {/if}
                  </button>
                </div>
              </div>

              <div class="space-y-1">
                <label for="domainSelect" class="text-xs font-semibold text-gray-600">Dominio</label>
                <select
                  id="domainSelect"
                  bind:value={selectedDomain}
                  class="border rounded px-2 py-1.5 text-sm min-w-[220px] w-full"
                >
                  {#each DOMAIN_OPTIONS as domain}
                    <option value={domain}>{domain}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <div class="text-sm text-[var(--gs1-forest-accessible)] font-medium">
            {#if gtinList.length > 0}
              {gtinList.length} producto(s)
            {/if}
          </div>

          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-t border-gray-200 pt-3">
            <div class="flex items-center gap-2.5">
              <input id="showGtinText" type="checkbox" bind:checked={showGtinText} class="h-4 w-4 text-[var(--gs1-blue)] border-gray-300 rounded focus:ring-[var(--gs1-blue)]" />
              <label for="showGtinText" class="text-sm text-[var(--gs1-blue)] select-none cursor-pointer">Agregar texto (01) GTIN-NUMBER debajo del QR</label>
            </div>

            <button
              class="btn btn-primary btn-md disabled:opacity-50"
              on:click={generateQRCodes}
              disabled={gtinList.length === 0}
              type="button"
            >
              Generar codigos QR
            </button>
          </div>

          {#if error}
            <div class="gs1-error-banner text-left text-base">
              {error}
            </div>
          {/if}

          <section class="pt-2">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-[var(--gs1-blue)]">Productos cargados</h3>
              {#if gtinList.length > 0}
                <span class="text-[var(--gs1-forest-accessible)] text-sm font-medium">{gtinList.length} producto(s)</span>
              {/if}
            </div>

            {#if gtinList.length === 0}
              <div class="text-sm text-gray-600">No hay productos cargados.</div>
            {:else}
              <div class="overflow-auto border border-gray-200 rounded-lg max-h-[42vh]">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="text-sm text-gray-700 border-b gs1-table-head">
                      <th class="py-2 px-2">GTIN</th>
                      <th class="py-2 px-2">Descripcion</th>
                      <th class="py-2 px-2">Empresa</th>
                      <th class="py-2 px-2">Fuente</th>
                      <th class="py-2 px-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each gtinList as item, idx}
                      <tr class="text-sm border-b gs1-table-hover">
                        <td class="py-1.5 px-2 align-middle">{item.gtin}</td>
                        <td class="py-1.5 px-2">{item.description}</td>
                        <td class="py-1.5 px-2">{item.licenseeName || '-'}</td>
                        <td class="py-1.5 px-2">{item.source || 'manual'}</td>
                        <td class="py-1.5 px-2">
                          <button class="btn btn-outline btn-sm" on:click={() => { gtinList = gtinList.filter((_, i) => i !== idx); }}>Eliminar</button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </section>
      </div>
      </div>
  </section>
</main>
