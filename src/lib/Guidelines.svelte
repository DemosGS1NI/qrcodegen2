
<script>
  import { onMount } from 'svelte';
</script>

<section class="max-w-4xl mx-auto px-4 py-10 text-gray-800">
  <h1 class="text-3xl font-bold mb-6">
    Directrices de diseño para Códigos QR con el estándar GS1 Digital Link
  </h1>

  <p class="mb-4">
    Los códigos QR impulsados por GS1 pueden proporcionar a varios usuarios, incluidos los actores de la cadena de suministro, cajeros, reguladores y consumidores, acceso a información crítica sobre los productos. Estas directrices solo son aplicables a los códigos QR impulsados por GS1 (con GS1 Digital Link dentro) basados en los estándares de GS1.
  </p>

  <ul class="list-disc list-inside mb-6">
    <li>Estos códigos QR son diferentes de cualquier otro código QR y pueden conectarse a datos enriquecidos.</li>
    <li>Pueden ser escaneados en el punto de venta (POS) y por teléfonos o apps para obtener información del producto en línea.</li>
  </ul>

  <h2 class="text-2xl font-semibold mt-8 mb-4">¿Cómo se usa?</h2>
  

  <h3 class="text-xl font-semibold mt-6 mb-2">Transición - código lineal y QR en el paquete</h3>
  <ul class="list-disc list-inside mb-4">
    <li>EAN-13: ancho de la barra más delgada igual a 0.33 mm</li>
    <li>Código QR: cuadrado más pequeño igual a 0.495 mm</li>
    <li>Altura mínima de la fuente para el texto GS1: 2 mm</li>
    <li>GTIN no incluido debajo del código QR</li>
  </ul>

  <img src="/guidelines/transition.png" alt="Transición código QR" class="mb-4"/>

  <h3 class="text-xl font-semibold mt-6 mb-2">Ambición 2027 - solo código QR en el paquete</h3>
  <ul class="list-disc list-inside mb-4">
    <li>Dimensión X del código QR: 0.495 mm</li>
    <li>Altura mínima del texto GS1 y GTIN: 2 mm</li>
    <li>GTIN incluido debajo del código QR</li>
  </ul>

  <img src="/guidelines/ambition.png" alt="Ambición 2027" class="mb-4"/>

  <h2 class="text-2xl font-semibold mt-8 mb-4">Zona de Silencio</h2>
  <p class="mb-4">Debe ser 4 veces la dimensión X en todos los lados del código QR.</p>
  <img src="/guidelines/font_size_placement.png" alt="Zona de silencio" class="mb-4"/>

  <h2 class="text-2xl font-semibold mt-8 mb-4">Ubicación de transición del código QR para POS</h2>
  <p class="mb-4">Los códigos QR que están destinados a ser escaneados en el POS deben colocarse dentro de los 50 mm del centro del código de barras lineal para lograr el objetivo de artículos escaneados por minuto (IPM).</p>
  <img src="/guidelines/transition_for_pos_max_distance.png" alt="Ubicación transición POS" class="mb-4"/>

  <h2 class="text-2xl font-semibold mt-8 mb-4">Ejemplos de ubicación durante la transición</h2>

  <img src="/guidelines/stacked_above_linear_code.png" alt="Ejemplo 2" class="mb-4"/>
  <img src="/guidelines/to_rigth_or_left.png" alt="Ejemplo 3" class="mb-4"/>

  <h2 class="text-2xl font-semibold mt-8 mb-4">Ejemplos de visualización en el Paquete</h2>
  <p class="mb-4"></p>
  <img src="/guidelines/on_pack_visualization.png" alt="Visualizacion en el Paquete" class="mb-4"/>
  <p class="mb-4"></p>
  <img src="/guidelines/consumer_engagement.png" alt="Participación del consumidor" class="mb-4"/>
</section>
