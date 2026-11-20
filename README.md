# GencyLog · Fase 4 UNAD · Prototipo local v2.0.0

**Caso de estudio:** ayuda humanitaria y trazabilidad de inventarios en Pereira–Dosquebradas.  
**Tipo:** prototipo de práctica simulada con datos sintéticos, sin backend, sin servicios externos y sin instalación de dependencias JavaScript.  
**Alcance académico:** recepción → inventario → traslados → necesidades → despachos → entrega → trazabilidad y auditoría.

## INICIO RÁPIDO

1. Descomprime el ZIP conservando todos los archivos y carpetas.
2. Abre `index.html` en Chrome, Edge o Firefox. Si el navegador restringe IndexedDB en archivos locales (`file://`), abre una terminal en esta carpeta y ejecuta:

   ```bash
   python -m http.server 8000
   ```

   Visita **http://localhost:8000**. Este servidor solo entrega archivos HTML/CSS/JS; **no existe backend, API, base de datos remota, proceso de autenticación ni envío de información a Internet**. Puedes cerrarlo tras instalar la aplicación para uso offline con service worker (en localhost/HTTPS), o seguir abriendo los archivos localmente si el navegador lo permite.
3. Usa el menú **Datos y calidad → Recorrido guiado** para probar el proceso completo.
4. Ve a **Datos y calidad → Descargar copia JSON** antes de restablecer o importar datos.

## FUNCIONALIDADES OPERATIVAS

| Pantalla | Acción realmente implementada | Controles aplicados |
|---|---|---|
| Resumen | Indicadores, rutas guiadas, necesidades, últimos movimientos | Métricas calculadas desde estado local |
| Recepciones | Crear lotes e ingresos; buscar; consultar trazabilidad | Recurso/centro existente, cantidad entera >0, donante, descripción |
| Inventario | Consultar saldos por lote y centro; realizar traslados y ajustes | Ledger derivado, sin saldos negativos, motivo de ajuste |
| Traslados | Transferir entre dos centros | Salida y entrada simultáneas, origen ≠ destino, disponibilidad suficiente |
| Despachos y entregas | Crear, confirmar o devolver despachos | Sin sobregiros; receptor y evidencia obligatorios; antirreplicación |
| Necesidades | Registrar, buscar, priorizar, cerrar y reabrir | Asociación recurso/zona, compromisos ≤ demanda |
| Trazabilidad | Inspeccionar movimientos por lote y exportar CSV | Historial con fecha, responsable, centro, variación y referencia |
| Bitácora | Consultar y exportar auditoría | Entrada por cada acción válida |
| Datos y calidad | Validar, exportar JSON/CSV, importar, restaurar demo | Rechazo de archivos inválidos; confirmaciones; protección entre pestañas |
| UX | Móvil/escritorio, modo oscuro, búsquedas, mensajes y teclado | Etiquetas, focus de formulario, Escape, estados en texto |

## PERSISTENCIA Y FUNCIONAMIENTO SIN BACKEND

- Todas las operaciones leen/escriben **IndexedDB** del navegador; no se hacen llamadas a una API operativa ni se envían registros a servidores. El service worker puede solicitar los archivos estáticos locales al origin para almacenarlos en caché.
- La base se guarda como un documento por transacción: una operación inválida no altera el estado persistido.
- Se verifica la revisión de la base antes de guardar para detectar modificaciones de otra pestaña y evitar sobrescrituras silenciosas. Si se detecta conflicto, recarga la página.
- Los saldos se calculan desde el **libro de movimientos**, no desde cantidades editables.
- La importación comprueba referencias, estados, transferencias, saldos, entregas, necesidades, cantidades y estructura antes de reemplazar.
- El service worker guarda en caché los archivos estáticos si la página se sirve desde localhost o HTTPS. Los datos de usuario no se guardan en caché HTTP: permanecen en IndexedDB.
- **No hay sincronización entre dispositivos** ni respaldo en la nube. La recuperación depende de exportaciones JSON que realice quien use la aplicación.
- Los datos del navegador pueden borrarse al limpiar el sitio, utilizar modo privado o cambiar de origen (`file://` ↔ `http://localhost`). En ese caso, importa el JSON en el nuevo origen.

## DATOS DE DEMOSTRACIÓN

- 3 centros académicos simulados: Pereira, Dosquebradas y Santa Rosa de Cabal.
- 6 categorías/referencias de insumos con unidades propias (litros, kits, unidades).
- 6 lotes iniciales, 15 movimientos en ledger, 4 despachos (3 entregados, 1 en tránsito), 5 necesidades.
- Los datos son **totalmente ficticios**, no se afirma que las entregas hayan ocurrido y no se conservan datos personales reales de afectados.
- La vista principal muestra **cantidades de registros**, no suma litros con kits o unidades incompatibles. El inventario mantiene sus magnitudes por recurso.
- Para estudiar los datos iniciales, consulta la carpeta `/datos` o el código `seed.js`.

## PRUEBAS

En un entorno con Node.js (v20+):

```bash
node --test tests/domain.test.cjs
```

**Batería ejecutada: 27 pruebas automatizadas de lógica; 27 aprobadas.** Se cubren secuencias completas, saldos, restricciones, idempotencia de entregas, devoluciones y rechazo de datos incompatibles. Se ejecutó además una prueba de interacción de escritorio (crear recepción, rechazar traslado excesivo, trasladar, crear necesidad, despachar y entregar) y una revisión de navegación móvil en Chromium con persistencia de prueba simulada. El entorno de ejecución no permitió comprobar la navegación a URLs reales en el navegador automatizado; la persistencia real IndexedDB debe verificarse manualmente en el equipo de despliegue. Ver `docs/VALIDACION_Y_LIMITES.md`.

## ALCANCE: DISTINCIÓN CON EL ARCHIVO ORIGINAL

El ZIP proporcionado inicialmente contiene una implementación React mucho más amplia, con adaptadores Phoenix, roles, donaciones, hogares, mapas, etc. En esta entrega, para cumplir el requisito **sin backend** y evitar pantallas de demostración sin acciones reales, se entrega **una aplicación local autónoma enfocada en el núcleo evaluable de la Fase 4**. La carpeta `referencia-original/` conserva el código original (sin archivos `.git`, dependencias ni compilaciones) como referencia histórica; **no forma parte de la aplicación autónoma**.

No se afirma que los módulos avanzados del proyecto original se hayan migrado o validado. En concreto: no hay multiusuario seguro, sincronización entre dispositivos, servicios clínicos, mapas institucionales, pagos, autorizaciones de servidor ni interoperabilidad real. La meta de madurez **TRL 5** requiere evaluación en el entorno relevante y evidencias del tutor, no se alcanza automáticamente por compilar o aprobar pruebas unitarias.

## ESTRUCTURA

- `index.html` — entrada, abrir en navegador.
- `styles.css` — diseño adaptable y modo oscuro.
- `seed.js` — escenario sintético inicial.
- `domain.js` — reglas, invariantes y transiciones, probado con Node.
- `storage.js` — IndexedDB, transacción y control de concurrencia.
- `app.js` — navegación, formularios, UX, respaldo y acciones.
- `sw.js`, `manifest.webmanifest` — instalación offline cuando el origen lo permite.
- `tests/` — pruebas automatizadas de dominio.
- `datos/` — conjunto de datos inicial de referencia.
- `docs/` — guía de uso y validación para la Fase 4.
- `referencia-original/` — archivos fuente del prototipo React recibido (histórico, no ejecutable en esta entrega autónoma).

## SEGURIDAD, ÉTICA Y LIMITACIONES

Este es un prototipo **académico local**. No ofrece autenticación ni RBAC real; no debe emplearse para emergencias reales o tratamiento de datos sensibles. IndexedDB protege contra fallos de conexión, pero **no equivale a backup ni garantiza integridad física del dispositivo**. No es correcto prometer margen de error cero. La validación automatizada reduce errores conocidos pero no sustituye evaluación de usuarios, pruebas manuales multi-navegador, auditoría WCAG ni ejercicios formales de TRL 5.
