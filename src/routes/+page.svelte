<script>
    import * as XLSX from 'xlsx';
    import JSZip from 'jszip';
    import QRCode from 'qrcode-svg';
  
    const DOMAIN = 'https://id.gs1.org';

let gtinList = [];
let error = '';
let fileInput;
let showGtinText = false;
  
  
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
  
    async function generateQRCodes() {
      if (gtinList.length === 0) {
        error = 'Por favor, cargue la lista de GTINs';
        return;
      }

      try {
        const zip = new JSZip();

        gtinList.forEach(product => {
          const qrContent = `${DOMAIN}/01/${product.gtin}`;
          const qr = new QRCode({
            content: qrContent,
            padding: 4, // Restore padding for quiet zone
            width: 256,
            height: 256,
            color: '#000000',
            background: '#ffffff',
            ecl: 'M'
          });

          let svg = qr.svg();
          if (showGtinText) {
            // Dynamically fit text width to QR width, excluding quiet zone
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElem = doc.documentElement;
            const qrWidth = parseInt(svgElem.getAttribute('width'));
            const qrHeight = parseInt(svgElem.getAttribute('height'));
            // Find smallest <rect> width to get module size
            const rects = doc.querySelectorAll('rect');
            let moduleSize = qrWidth; // start with max
            rects.forEach(r => {
              const w = parseFloat(r.getAttribute('width'));
              if (w > 0 && w < moduleSize) moduleSize = w;
            });
            // padding in modules (from QRCode config)
            const paddingModules = 4;
            const drawableWidth = qrWidth - 2 * (paddingModules * moduleSize);
            let fontSize = 24; // start big
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
            const newHeight = qrHeight + textHeight;
            svgElem.setAttribute('height', newHeight);
            svgElem.setAttribute('viewBox', `0 0 ${qrWidth} ${newHeight}`);

            // Add text element, centered, right below QR, not truncated
            const textElem = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElem.setAttribute('x', qrWidth / 2);
            // Move text up so it's closer to QR and fully visible
            textElem.setAttribute('y', qrHeight + fontSize * 0.05);
            textElem.setAttribute('text-anchor', 'middle');
            textElem.setAttribute('font-size', String(fontSize));
            textElem.setAttribute('fill', '#000');
            textElem.setAttribute('font-family', 'Arial, sans-serif');
            textElem.setAttribute('width', qrWidth);
            textElem.setAttribute('dominant-baseline', 'hanging');
            textElem.textContent = text;
            svgElem.appendChild(textElem);
            svg = new XMLSerializer().serializeToString(svgElem);
          }

          // Create filename with GTIN and description
          let filename = product.gtin;
          if (product.description) {
            filename += '_' + sanitizeFilename(product.description);
          }

          zip.file(`${filename}.svg`, svg);
        });

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
  </script>
  
  <svelte:head>
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap" rel="stylesheet" />
  </svelte:head>
  <main class="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-0 font-sans" style="font-family: 'Open Sans', Arial, sans-serif;">
    <section class="w-full max-w-4xl mx-auto px-8">
      <h1 class="text-4xl font-bold text-left text-[#003366] mb-8 mt-8 tracking-tight font-sans">
        Generador de Códigos QR
      </h1>

      <div class="space-y-10">
        <!-- Instrucciones primero -->
        <section class="py-2">
          <h2 class="text-2xl font-bold text-[#003366] mb-2 font-sans">Instrucciones</h2>
          <p class="text-base text-[#333] mb-2 font-sans">Este generador de QRs es para usuarios que ya tienen sus productos en ACTIVATE, por lo que el formato excel requerido es un export de los productos del usuario desde ACTIVATE. Para generar dicho archivo excel usted debe suplantar al usuario en Activate y Exportar sus Productos. Este seria el archivo que se va a cargar en esta herramienta.</p>
          <p class="text-base text-[#333] mb-2 font-sans">El QR generado por esta herramienta trabaja con dos escenarios:</p>
          <ul class="list-disc list-inside text-[#333] mb-2 font-sans">
            <li><span class="font-semibold text-[#003366]">Escenario 1:</span> La información del producto está actualizada en Activate, incluyendo la imagen del producto. El QR mostrará la página de Verified by GS1.</li>
            <li><span class="font-semibold text-[#003366]">Escenario 2:</span> El usuario ha proveído un link (página de la empresa, página de Facebook, etc). El resolver de GS1 redirigirá al usuario a esa página.</li>
          </ul>
        </section>

        <!-- Formato del archivo -->
        <section class="py-2">
          <h2 class="text-2xl font-bold text-[#003366] mb-2 font-sans">Formato del archivo Excel</h2>
          <p class="text-base text-[#333] font-sans">Los GTINs deben estar en la columna <b>B</b> y las descripciones (opcionales) en la columna <b>F</b>, comenzando desde la fila 3.</p>
        </section>

        <!-- Dominio -->
        <section class="py-2">
          <h2 class="text-2xl font-bold text-[#003366] mb-2 font-sans">Dominio utilizado en los QR</h2>
          <p class="text-base text-[#333] font-sans"><span class="font-semibold text-[#003366]">Dominio:</span> <span class="font-medium">{DOMAIN}</span></p>
        </section>

        <div class="flex flex-col gap-2">
          <label class="text-lg font-semibold text-[#003366] font-sans" for="fileInput">Archivo Excel</label>
          <div class="flex gap-2 items-center">
            <button
              class="px-6 py-3 bg-[#003366] text-white rounded hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-[#003366] font-semibold transition-colors"
              on:click={() => fileInput.click()}
              tabindex="0"
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

        <div class="flex items-center space-x-3">
          <input id="showGtinText" type="checkbox" bind:checked={showGtinText} class="h-5 w-5 text-[#003366] border-gray-300 rounded focus:ring-[#003366]" />
          <label for="showGtinText" class="text-lg text-[#003366] select-none cursor-pointer font-sans">Agregar texto (01) GTIN-NUMBER debajo del QR</label>
        </div>

        {#if error}
          <div class="bg-[#ffeaea] text-[#b71c1c] p-4 rounded-md text-left border border-[#f5c6cb] font-sans">
            {error}
          </div>
        {/if}

        <button
          class="w-full px-6 py-3 bg-[#003366] text-white rounded hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-[#003366] font-semibold text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-sans"
          on:click={generateQRCodes}
          disabled={gtinList.length === 0}
        >
          Generar Códigos QR
        </button>
      </div>
    </section>
  </main>