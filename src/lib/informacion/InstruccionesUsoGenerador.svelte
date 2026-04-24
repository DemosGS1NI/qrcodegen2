<section class="prose prose-sm max-w-none text-gray-800">
  <p>
    Este generador de QRs es para usuarios que ya tienen sus productos en ACTIVATE, por lo que el formato excel requerido
    es un export de los productos del usuario desde ACTIVATE. Para generar dicho archivo excel usted debe suplantar al usuario
    en Activate y exportar sus productos. Ese archivo es el que se carga en esta herramienta.
  </p>

  <p>
    Se debe tener cuidado de generar listado de productos para venta al consumidor. En este momento no se estan generando
    codigos QR para grupo de productos (DUN).
  </p>

  <h3>Escenarios de funcionamiento</h3>
  <ul>
    <li><strong>Escenario 1:</strong> Si el usuario no tiene presencia en internet, no se crea ningun link y por defecto el resolver GS1 envia al consumidor a la pagina de Verified by GS1.</li>
    <li><strong>Escenario 2:</strong> Si el usuario provee un link y se agrega a Registry Links, el resolver GS1 redirige al consumidor a dicha pagina.</li>
    <li><strong>Escenario 3:</strong> Si el usuario no tiene landing page pero quiere mostrar ciertos links, se puede usar Verified by GS1 como landing page y agregar links adicionales segun el usuario requiera.</li>
  </ul>

  <h3>Formato del archivo Excel</h3>
  <p>
    Los GTINs deben estar en la columna <strong>B</strong> y las descripciones (opcionales) en la columna <strong>F</strong>, comenzando desde la fila 3.
  </p>

  <h3>Propiedades generales de los QR generados</h3>
  <ul>
    <li><strong>Tamano del modulo:</strong> configurable por el usuario (GS1 minimo 0.495 mm, maximo 0.99 mm).</li>
    <li><strong>Modo de codificacion:</strong> Byte.</li>
    <li><strong>Estructura del simbolo:</strong> Model 2.</li>
    <li><strong>Nivel de correccion de errores:</strong> M (Medium).</li>
    <li><strong>Zona de silencio:</strong> 4 modulos alrededor del simbolo.</li>
  </ul>

  <h3>Flujo recomendado</h3>
  <ol>
    <li>Cargar archivo de productos (o agregar GTINs manualmente).</li>
    <li>Configurar dominio y tamano de modulo del QR.</li>
    <li>Generar y descargar el archivo <strong>codigos-qr.zip</strong>.</li>
  </ol>
</section>
