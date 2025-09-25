<script>
    import * as XLSX from 'xlsx';
    import JSZip from 'jszip';
    import QRCode from 'qrcode-svg';
   import Guidelines from "../../lib/Guidelines.svelte";

    // Domain options for QR encoding
    const DOMAIN_OPTIONS = [
      'https://id.gs1.org/',
      'https://resolver-st.gs1.org/'
    ];
    let selectedDomain = DOMAIN_OPTIONS[0];

let gtinList = [];
let error = '';
let fileInput;
let showGtinText = false;
let showGuidelines = false;
let qrConfigSummary = [];
let manualGtin = '';
let manualDescription = '';

// GS1 x-dimension target: 0.495 mm
const MM_TO_PX = 3.7795;
let moduleSizeMm = 0.99; // default to 2x GS1
let moduleSizePx = moduleSizeMm * MM_TO_PX;
  
  
    async function handleFileUpload(event) {
      const file = event.target.files?.[0];
      
      if (file) {
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
                products.push({ gtin, description });
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
    }
  
    function sanitizeFilename(name) {
      // Replace invalid filename characters with underscore
      return name.replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .substring(0, 100); // Limit filename length
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
        error = '';
      } catch (err) {
        error = 'Error al generar los códigos QR';
        console.error(err);
      }
    }

    function addManualGtin() {
      const gtin = manualGtin.trim();
      const description = manualDescription.trim();
      if (gtin) {
        gtinList = [...gtinList, { gtin, description }];
        manualGtin = '';
        manualDescription = '';
        error = '';
      } else {
        error = 'Ingrese un GTIN válido.';
      }
    }
</script>
  
  <svelte:head>
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap" rel="stylesheet" />
  </svelte:head>

<main class="min-h-screen bg-[#f7f7f7] w-full font-sans" style="font-family: 'Open Sans', Arial, sans-serif;">
  <section class="w-full px-0 md:px-8 max-w-none mx-auto">
    <div class="w-full flex flex-col gap-0">
      <div class="w-full flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4 pt-8 px-4 md:px-0">
        <h1 class="text-3xl font-bold text-[#003366] tracking-tight">Generador de Códigos QR</h1>
      </div>
      <div class="w-full flex flex-col gap-10 py-8 px-4 md:px-0">
        <!-- Module size slider -->
        <section class="py-2">
          <h2 class="text-lg md:text-xl font-bold text-[#003366] mb-2 font-sans">Tamaño del módulo QR</h2>
          <div class="flex items-center gap-4 flex-wrap">
            <label for="moduleSizeSlider" class="text-base text-[#333] font-sans font-semibold">Tamaño módulo (mm):</label>
            <input
              id="moduleSizeSlider"
              type="range"
              min="0.495"
              max="0.99"
              step="0.001"
              bind:value={moduleSizeMm}
              class="w-64"
            />
            <span class="text-base text-[#003366] font-sans font-semibold">{moduleSizeMm} mm</span>
            <span class="text-xs text-gray-500">(GS1 mínimo: 0.495 mm, máximo: 0.99 mm)</span>
          </div>
        </section>

        <!-- General QR info (applies to all generated codes) -->
        <section class="py-2">
          <h2 class="text-lg md:text-xl font-bold text-[#003366] mb-2 font-sans">Propiedades generales de los QR generados</h2>
          <ul class="list-disc list-inside text-[#333] mb-2 font-sans text-base">
            <li><b>Tamaño del módulo:</b> {moduleSizeMm} mm ({(moduleSizeMm * MM_TO_PX).toFixed(2)} px)</li>
            <li><b>Modo de codificación:</b> Byte</li>
            <li><b>Estructura del símbolo:</b> Model 2</li>
            <li><b>Nivel de corrección de errores:</b> M (Medium)</li>
            <li><b>Zona de silencio:</b> 4 módulos</li>
            <li><b>Zona de silencio (px):</b> {(4 * moduleSizeMm * MM_TO_PX).toFixed(2)} px</li>
            <li><b>Zona de silencio (mm):</b> {(4 * moduleSizeMm).toFixed(3)} mm</li>
          </ul>
        </section>
        <!-- Instrucciones primero -->
        <section class="py-2">
          <h2 class="text-xl md:text-2xl font-bold text-[#003366] mb-2 font-sans">Instrucciones</h2>
          <p class="text-base text-[#333] mb-2 font-sans">Este generador de QRs es para usuarios que ya tienen sus productos en ACTIVATE, por lo que el formato excel requerido es un export de los productos del usuario desde ACTIVATE. Para generar dicho archivo excel usted debe suplantar al usuario en Activate y Exportar sus Productos. Este seria el archivo que se va a cargar en esta herramienta.</p>
          <p class="text-base text-[#333] mb-2 font-sans">Se debe tener cuidado de generar listado de productos para venta al consumidor. En este momento no se estan generando codigos QR para Grupo de Productos (DUN).</p>
          <p class="text-base text-[#333] mb-2 font-sans">El QR generado trabaja de varias maneras o escenarios:</p>
          <ul class="list-disc list-inside text-[#333] mb-2 font-sans">
            <li><span class="font-semibold text-[#003366]">Escenario 1:</span> Si el usuario no tiene presencia en internet. No se crea ningun link y por defecto, el resolver GS1 enviara al consumidor a la pagina de Verified by GS1.</li>
            <li><span class="font-semibold text-[#003366]">Escenario 2:</span> Si el usuario ha proveído un link y el link se ha agregado a registry Links.  El resolver de GS1 redirigirá al consumidor a dicha página.</li>
            <li><span class="font-semibold text-[#003366]">Escenario 3:</span> Si el usuario no tiene landing page, pero quiere mostrar ciertos links, se puede usar Verified by GS1 como landing page y agregar links adicionales según el usuario requiera. Para esto, el primer link que se crear es el que lo diriga a verified by GS1</li>
          </ul>
        </section>

        <!-- Formato del archivo -->
        <section class="py-2">
          <h2 class="text-xl md:text-2xl font-bold text-[#003366] mb-2 font-sans">Formato del archivo Excel</h2>
          <p class="text-base text-[#333] font-sans">Los GTINs deben estar en la columna <b>B</b> y las descripciones (opcionales) en la columna <b>F</b>, comenzando desde la fila 3.</p>
        </section>

        <!-- Dominio -->
        <section class="py-2">
          <h2 class="text-xl md:text-2xl font-bold text-[#003366] mb-2 font-sans">Dominio utilizado en los QR</h2>
          <div class="flex items-center gap-2 flex-wrap">
            <label for="domainSelect" class="text-base text-[#333] font-sans font-semibold">Dominio:</label>
            <select
              id="domainSelect"
              bind:value={selectedDomain}
              class="border rounded px-2 py-1 text-base font-sans min-w-[240px] md:min-w-[340px]"
            >
              {#each DOMAIN_OPTIONS as domain}
                <option value={domain}>{domain}</option>
              {/each}
            </select>
          </div>
        </section>

        <!-- Button to toggle guidelines -->
        <section class="py-2">
          <div class="flex gap-2 items-center">
            <button
              class="btn btn-outline btn-lg"
              on:click={() => showGuidelines = !showGuidelines}
              type="button"
            >
              {showGuidelines ? 'Ocultar directrices' : 'Vea las directrices'}
            </button>
          </div>
          {#if showGuidelines}
            <div class="mt-4"><Guidelines /></div>
          {/if}
        </section>

        <div class="flex flex-col gap-2">
          <label class="text-base md:text-lg font-semibold text-[#003366] font-sans" for="fileInput">Archivo Excel</label>
          <div class="flex gap-2 items-center flex-wrap">
            <button
              class="btn btn-primary btn-lg"
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
            {#if gtinList.length > 0}
              <span class="text-[#00853f] font-medium ml-2">
                ✓ {gtinList.length} productos cargados
              </span>
            {/if}
          </div>
        </div>

        <!-- Manual GTIN entry -->
        <div class="flex flex-col gap-2 mt-4">
          <label class="text-base md:text-lg font-semibold text-[#003366] font-sans" for="manualGtin">Agregar GTIN manualmente</label>
          <div class="flex gap-2 items-center flex-wrap">
            <input
              id="manualGtin"
              type="text"
              bind:value={manualGtin}
              placeholder="GTIN"
              class="border rounded px-2 py-1 text-base font-sans w-40"
            />
            <input
              id="manualDescription"
              type="text"
              bind:value={manualDescription}
              placeholder="Descripción (opcional)"
              class="border rounded px-2 py-1 text-base font-sans w-64"
            />
            <button
              class="btn btn-success btn-md"
              on:click={addManualGtin}
              type="button"
            >
              Agregar
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3 mt-2">
          <input id="showGtinText" type="checkbox" bind:checked={showGtinText} class="h-5 w-5 text-[#003366] border-gray-300 rounded focus:ring-[#003366]" />
          <label for="showGtinText" class="text-base md:text-lg text-[#003366] select-none cursor-pointer font-sans">Agregar texto (01) GTIN-NUMBER debajo del QR</label>
        </div>

        {#if error}
          <div class="bg-[#ffeaea] text-[#b71c1c] p-4 rounded-md text-left border border-[#f5c6cb] font-sans text-base">
            {error}
          </div>
        {/if}

        <button
          class="btn btn-primary btn-lg w-full disabled:opacity-50 mt-4"
          on:click={generateQRCodes}
          disabled={gtinList.length === 0}
          type="button"
        >
          Generar Códigos QR
        </button>

        <!-- Footer -->
        <footer class="w-full mt-12 py-6 border-t border-gray-200 text-center text-sm text-gray-500 font-sans">
          <div class="mb-2">
            <img src="/favicon.png" alt="GS1 Logo" class="inline-block h-6 align-middle mr-2" />
            <span class="font-semibold text-[#003366]">GS1 Nicaragua</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} GS1 Nicaragua. Todos los derechos reservados.
          </div>
        </footer>

      </div>
    </div>
  </section>
</main>
