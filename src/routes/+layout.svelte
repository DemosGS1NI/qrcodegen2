<script>
  import '../app.css';
</script>

<nav class="w-full bg-[#003366] text-white py-4 px-8 flex justify-between items-center font-sans">
  <div class="text-2xl font-bold tracking-tight">GS1 Nicaragua</div>
  <div class="flex gap-6">
    <a href="/generador-codigos-qr" class="hover:underline text-lg">Generador de códigos QR</a>
    <a href="/manejo-enlaces" class="hover:underline text-lg">Manejo de Enlaces</a>
  </div>
</nav>

<slot />
