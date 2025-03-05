<script>
    import * as XLSX from 'xlsx';
    import JSZip from 'jszip';
    import QRCode from 'qrcode-svg';
  
    const DOMAIN = 'https://id.gs1.org';
    let isLoggedIn = false;
    let username = '';
    let password = '';
    let captchaValue = '';
    let generatedCaptcha = '';
    let gtinList = [];
    let error = '';
    let fileInput;
  
    function generateCaptcha() {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let captcha = '';
      for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      generatedCaptcha = captcha;
    }
  
    // Generate initial CAPTCHA on mount
    generateCaptcha();
  
    function handleLogin(e) {
      e.preventDefault();
      if (username === 'admin' && password === 'password123') {
        if (captchaValue === generatedCaptcha) {
          isLoggedIn = true;
          error = '';
        } else {
          error = 'Código CAPTCHA incorrecto';
          generateCaptcha();
        }
      } else {
        error = 'Usuario o contraseña incorrectos';
      }
    }
  
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
            padding: 4,
            width: 256,
            height: 256,
            color: '#000000',
            background: '#ffffff',
            ecl: 'M'
          });
          
          // Create filename with GTIN and description
          let filename = product.gtin;
          if (product.description) {
            filename += '_' + sanitizeFilename(product.description);
          }
          
          zip.file(`${filename}.svg`, qr.svg());
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
  
  <main class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    {#if !isLoggedIn}
      <div class="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">
          Acceso al Sistema
        </h1>
  
        <form on:submit={handleLogin} class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              bind:value={username}
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ingrese su usuario"
            />
          </div>
  
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              bind:value={password}
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ingrese su contraseña"
            />
          </div>
  
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              CAPTCHA
            </label>
            <div class="bg-gray-100 p-3 text-center font-mono text-lg mb-2 rounded">
              {generatedCaptcha}
            </div>
            <input
              type="text"
              bind:value={captchaValue}
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ingrese el código CAPTCHA"
            />
          </div>
  
          {#if error}
            <div class="bg-red-50 text-red-600 p-4 rounded-md text-center">
              {error}
            </div>
          {/if}
  
          <button
            type="submit"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Ingresar
          </button>
        </form>
      </div>
    {:else}
      <div class="w-full max-w-lg bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">
          Generador de Códigos QR
        </h1>
  
        <div class="space-y-6">
          <div class="bg-blue-50 p-4 rounded-md">
            <p class="text-sm text-blue-800">
              Dominio: <span class="font-medium">{DOMAIN}</span>
            </p>
            <p class="text-sm text-blue-800 mt-2">
              Formato: Los GTINs deben estar en la columna B y las descripciones (opcionales) en la columna F, comenzando desde la fila 3.
            </p>
          </div>
  
          <div>
            <button
              class="w-full px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
              on:click={() => fileInput.click()}
            >
              Cargar Archivo Excel
            </button>
            <input
              bind:this={fileInput}
              type="file"
              accept=".xlsx,.xls"
              on:change={handleFileUpload}
              class="hidden"
            />
            {#if gtinList.length > 0}
              <p class="mt-2 text-center text-sm text-green-600">
                ✓ {gtinList.length} productos cargados
              </p>
            {/if}
          </div>
  
          {#if error}
            <div class="bg-red-50 text-red-600 p-4 rounded-md text-center">
              {error}
            </div>
          {/if}
  
          <button
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            on:click={generateQRCodes}
            disabled={gtinList.length === 0}
          >
            Generar Códigos QR
          </button>
        </div>
      </div>
    {/if}
  </main>