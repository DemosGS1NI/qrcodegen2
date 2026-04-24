<script>
  import '../app.css';
  import { page } from '$app/stores';

  const navItems = [
    { href: '/generador-codigos-qr', label: 'Generador de codigos QR' },
    { href: '/manejo-enlaces', label: 'Consultar Enlaces' },
    { href: '/reportes', label: 'Reportes' },
    { href: '/informacion', label: 'Informacion' }
  ];

  function isActiveRoute(pathname, href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
</script>

<nav class="w-full gs1-nav py-4 px-4 md:px-8 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
  <div class="text-xl md:text-2xl font-bold tracking-tight">GS1 Nicaragua</div>
  <div class="flex flex-wrap gap-2 md:gap-3">
    {#each navItems as item}
      <a href={item.href} class={`gs1-nav-link ${isActiveRoute($page.url.pathname, item.href) ? 'active' : ''}`}>
        {item.label}
      </a>
    {/each}
  </div>
</nav>

<slot />
