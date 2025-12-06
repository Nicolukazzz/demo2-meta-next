## Animaciones reutilizables

- `AnimatedPage`: envuelve vistas que cambian (key por sección). Fade + slide suave.
- `AnimatedModal`: entrada scale + fade, overlay con fade.
- `NeonCard` anima por defecto con `animate-card-fade`. Pasa `animated={false}` para desactivar.
- `Skeletons`: `SkeletonCard`, `SkeletonListItem`, `SkeletonLine` para estados de carga con shimmer suave.
- Respeta `prefers-reduced-motion` a través de `usePrefersReducedMotion`.

## Botón asíncrono
- `SaveButton`: estados `idle | loading | success | error`, animación ligera y feedback ✓.

## Cómo usar
- Importa y envuelve el contenido dinámico con `AnimatedPage` o `AnimatedModal`.
- Usa `Skeleton*` mientras esperas datos (`loading === true`).
- Usa `SaveButton` para cualquier acción async de guardado en formularios/modales.
