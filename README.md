# War Room Partidos GT 2027 · versión clara

Herramienta comercial interna: los 28 partidos políticos vigentes ante el TSE de Guatemala para las elecciones generales 2027, con score de prioridad, decisor, contacto directo, pitch y músculo territorial de cada uno.

Corte de datos: 22 sep 2026. Fuente base: https://tse.org.gt/images/descargas/LPP28082026.pdf más enriquecimiento propio.

## Cómo correrla

Sin build, sin dependencias, sin servidor. Abrí `index.html` directo en el navegador (doble clic) y funciona. Si preferís servirla:

```
npx serve .
```

## Estructura

```
index.html          Estructura de la página (shell estático)
css/styles.css      Todo el estilo. Tokens del tema en :root al inicio
js/data.js          La base de datos de los 28 partidos (var DATA)
js/app.js           Lógica: filtros, orden, búsqueda, KPIs, dossier
data/partidos.json  Copia limpia de la data en JSON puro, para pipelines
```

## Funcionalidad

- KPIs con conteo animado: vigentes, con presidenciable, afiliados totales, cuentas score A
- Franja de padrón: cada partido es un segmento proporcional a sus afiliados; clic abre su dossier
- Búsqueda por partido, candidato o decisor
- Filtros por score A/B/C y por presidenciable anunciado
- Orden por llamada sugerida, afiliados, fuerza territorial o alfabético
- Dossier deslizante por partido: decisor con nivel de confianza, teléfono, correo, mejor canal, sede, pitch sugerido, músculo territorial, sanciones TSE, redes y notas de campo
- Botón OCULTAR CONTACTOS: enmascara teléfonos y correos, útil al compartir pantalla

## Cómo actualizar la data

Cada partido es un objeto en `js/data.js`. Campos principales:

| Campo | Qué es |
|---|---|
| `sig`, `nombre` | Siglas y nombre oficial |
| `afiliados` | Afiliados aproximados (padrón TSE) |
| `color`, `accent` | Color oficial y su versión ajustada para fondo claro |
| `pres`, `presAnunciado` | Presidenciable y si ya está anunciado |
| `decisor`, `decisorCargo`, `confianza`, `porQue` | Puerta de entrada comercial |
| `tel`, `telAlt`, `correo`, `canal`, `sede`, `zona`, `horario` | Contacto directo |
| `score`, `scoreRazon`, `orden` | Score A/B/C, su razón y orden de llamada sugerido |
| `pitch` | Pitch de una línea |
| `rank`, `dip`, `alc`, `deptos` | Músculo: ranking de padrón, diputados y alcaldes 2023, departamentos |
| `promo2023`, `riesgo`, `sancion` | Historial de compra 2023, riesgo de cobro, sanciones TSE |
| `web`, `fb`, `ig`, `x`, `tiktok` | Redes (URLs completas) |
| `notas` | Notas de campo |

Un campo sin dato va como `null` y la interfaz muestra "s/d".

Ojo con `accent`: si agregás un partido con color oficial claro (amarillos, celestes), oscurecelo hasta que pase contraste 4.5:1 sobre blanco, o dejá `accent` igual a `color` solo si ya es oscuro.

## Retematizar

Todos los colores del tema están como variables CSS en `:root` dentro de `css/styles.css`. La franja de la bandera y el celeste institucional salen de `--celeste`. Tipografías: Unbounded (display), Space Grotesk (cuerpo), IBM Plex Mono (datos), cargadas desde Google Fonts en `index.html`.

## Nota de uso

Documento de uso interno: contiene teléfonos y correos de contactos reales. Diputados y alcaldes son los electos en 2023, no las bancadas actuales.
