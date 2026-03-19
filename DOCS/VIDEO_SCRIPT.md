# Guion de video — GS1 Nicaragua: Generador QR y Gestión de Enlaces

Duración sugerida: 3–4 minutos
Tono: profesional, directo y demostrativo
Mostrar en pantalla: interfaz de la app, rutas de archivos clave y fragmentos de código relevantes.

0:00–0:10 — Apertura (pantalla: logo / título)
- On-screen: Título grande “GS1 Nicaragua — Generador de Códigos QR y Gestión de Enlaces”
- Narrador: “Hola, soy [tu nombre]. En este video les mostraré una herramienta interna para generar códigos QR individual o por lotes y gestionar enlaces GS1 Digital Link.”

0:10–0:25 — Resumen rápido (pantalla: lista de beneficios)
- On-screen: 3 bullets: “Generar QR por lote”, “Validación GTIN con GS1”, “Gestionar/actualizar enlaces”
- Narrador: “La aplicación permite crear SVGs de QR a partir de un Excel con GTINs, validar GTINs contra GS1 y actualizar enlaces digitales de producto desde una UI segura.”

0:25–0:35 — Navegación inicial (pantalla: menú principal)
- On-screen: barra de navegación, resaltar Generador de códigos QR y Gestionar Enlaces
- Narrador: “Desde el menú accedemos a las dos funcionalidades principales: Generador de Códigos QR y Gestionar Enlaces.”

0:35–1:15 — Demo 1: Generador de Códigos QR (mostrar src/routes/generador-codigos-qr/+page.svelte)
- On-screen: subir archivo Excel, vista previa de filas detectadas
- Narrador: “Sube un Excel exportado de GS1 Activate: los GTINs deben ir en la columna B y las descripciones (opcional) en la columna F, empezando en la fila 3.”
- On-screen: pasos numerados: “1) Subir → 2) Validar → 3) Configurar dominio/tamaño → 4) Generar”
- Narrador: “La app valida los GTINs con la API de GS1, permite agregar GTINs manualmente y ajustar el tamaño del módulo del QR siguiendo las recomendaciones GS1.”
- On-screen: previsualización de SVG por GTIN
- Narrador: “Al finalizar, descarga un archivo codigos-qr.zip con todos los SVGs.”

1:15–1:55 — Demo 2: Gestionar Enlaces (mos

trar src/routes/manejo-enlaces/+page.svelte, LinksTable.svelte, LinkEditor.svelte)
- On-screen: campo búsqueda GTIN, lista de enlaces cargados
- Narrador: “Busca un GTIN para cargar sus enlaces actuales. Puedes eliminar enlaces no predeterminados, editar o añadir nuevos, y fusionar cambios antes de enviarlos.”
- On-screen: ejemplo de edición de enlace y validación de URL
- Narrador: “Si falta el enlace por defecto, la app lo crea automáticamente para mantener la consistencia.”

1:55–2:15 — Envío y seguimiento de batch (mostrar FeedbackStatus.svelte)
- On-screen: pantalla mostrando batchId y barra de estado con polling
- Narrador: “Las actualizaciones se envían a la API de GS1 y la respuesta incluye un batchId. La app consulta periódicamente el estado del procesamiento y muestra resultados (exitoso / errores).”

2:15–2:35 — Entradas y salidas
- On-screen: listar “Entrada: .xlsx”, “Salida: SVGs + codigos-qr.zip”
- Narrador: “Entradas: archivos Excel con GTINs. Salidas: un SVG por GTIN, empaquetados en codigos-qr.zip para descarga.”

2:35–2:55 — Configuración y seguridad (mostrar src/hooks.server.js y DOCS/PRODUCT_OVERVIEW.md)
- On-screen: nota sobre variable de entorno API_KEY y autenticación básica
- Narrador: “Para operar necesitas definir la variable de entorno API_KEY para las llamadas a GS1. La app aplica HTTP Basic Auth globalmente; asegúrate de usar credenciales seguras en producción.”

2:55–3:10 — Casos de uso y audiencia
- On-screen: bullets: “Equipos de catálogos”, “Operaciones GS1”, “Control de calidad”
- Narrador: “Esta herramienta es ideal para equipos que gestionan catálogos GS1 y necesitan generar QR en lote o sincronizar enlaces digitales sin procesos manuales complejos.”

3:10–3:25 — Pistas técnicas y dónde mirar el código
- On-screen: rutas clave:
  - DOCS/PRODUCT_OVERVIEW.md
  - src/routes/generador-codigos-qr/+page.svelte
  - src/routes/manejo-enlaces/+page.svelte
  - static/gs1-linktypes.json
- Narrador: “Para detalles técnicos revisa el PRODUCT_OVERVIEW.md y las rutas mostradas en pantalla. El proyecto requiere Node >=18 <25 y usa SvelteKit.”

3:25–3:40 — Cierre y llamado a la acción
- On-screen: “Contacto / Comentarios”
- Narrador: “Gracias por ver la demo. Si quieres una guía paso a paso o un tutorial para contribuir al repositorio, comenta abajo o contáctame. ¡Hasta pronto!”

Notas de producción rápidas
- Duración objetivo: 3–4 minutos.
- Alternar planos: cámara + pantalla (donde cámara introduce y concluye, pantalla para demos).
- Incluir captions para pasos clave y resaltar archivos/rutas con overlay.
- Preparar archivo Excel de ejemplo para la demo de importación.
EOF