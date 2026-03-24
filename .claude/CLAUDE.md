# Proyecto: Automatización de Selección de Acciones

## Objetivo

Workflow n8n que automatiza la selección de acciones para inversión desde una watchlist en Google Sheets, generando recomendaciones diarias en tabs por perfil de riesgo.

## Workflow Actual

- **ID n8n**: `aRJpQ33RYDAzppia`
- **Nombre**: `FLOW-stock-screener-v4-RSI-COMPLETO`
- **Estado**: Funcional — Score v10 deployado
- **Fuente de datos**: Finviz scraping (100% — FMP y Alpha Vantage descartados por límites)
- **Versión Score node**: v10

## Fuente de Datos: Finviz Scraping

- **URL**: `https://finviz.com/quote.ashx?t={TICKER}&ty=c&ta=1&p=d`
- **Método**: HTTP Request con User-Agent de navegador + parsing HTML en Code node
- **Delay**: 2 segundos entre requests (batchSize: 1, batchInterval: 2000) para evitar rate limit
- **Extracción**: Función `getMetric(html, label)` busca `>LABEL</td>` y extrae el `<b>`
- **Caso especial Dividend**: Label está dentro de `<a>`, usar `getMetricLinked(html, 'Dividend TTM')`
- **Formato dividendo**: `1.72 (6.36%)` — extraer el % entre paréntesis

### Campos que extrae Finviz

| Campo | Label en HTML |
|-------|--------------|
| P/E | `P/E` |
| EPS next Y (crecimiento) | `EPS next Y` |
| ROE | `ROE` |
| Profit Margin | `Profit Margin` |
| Beta | `Beta` |
| Market Cap | `Market Cap` |
| RSI | `RSI (14)` |
| Precio | `Price` |
| 52W High | `52W High` |
| Dividend | `Dividend TTM` (dentro de `<a>`) |

### Variantes HTML de valores en Finviz

```html
<!-- Valor simple -->
<b>33.69</b>

<!-- Valor con color (ej. RSI sobreventa) -->
<b><span class="color-text is-positive">21.46</span></b>

<!-- Dividend con yield -->
<b>1.72 (<span class="color-text is-positive">6.36%</span>)</b>
```

El `.replace(/<[^>]+>/g, '').trim()` en `getMetric` stripea los spans y deja el texto limpio.

## Estrategia de Filtrado y Scoring

### Filtro Fundamental (los 5 deben cumplirse)

| Criterio | Condición |
|----------|-----------|
| P/E | > 0 y < 40 |
| EPS Growth (próximo año) | > 10% |
| Profit Margin | > 0% |
| ROE | > 5% |
| Market Cap | > $500M |

- Si **falla alguno**: `filtrado=false`, `reason` muestra el valor exacto (ej. `EPS_GROWTH=8.7% | ROE=4.2%`)
- Si **pasa todo**: `filtrado=true`, `reason=PASSED`
- **Señales solo para tickers que pasan el filtro fundamental**

### Perfiles de Riesgo (solo aplica a filtrados=true)

| Perfil | Condición |
|--------|-----------|
| **Conservador** | MarketCap > 10B AND Beta < 1.0 AND DividendYield > 0% |
| **Arriesgado** | Beta >= 1.15 AND EPSGrowth > 20% |
| **Balanceado** | Todo lo demás que pasa el filtro |

### Señal de Compra (solo para filtrados=true)

| RSI | Señal |
|-----|-------|
| < 30 y Score > 60 | COMPRA FUERTE |
| < 40 | COMPRA |
| 40–70 | NEUTRAL |
| > 70 | ESPERAR |
| N/A | SIN RSI |

### Scoring (ScoreFund + ScoreTec = Score total)

**ScoreFund (0-30):**
- PE: <15→10pts, <25→7pts, <40→5pts
- ROE: >20%→10pts, >10%→7pts, >5%→3pts
- ProfitMargin: >20%→10pts, >10%→7pts, >0%→3pts

**ScoreTec (0-25):**
- RSI <30→18pts, <40→15pts, <60→10pts, <70→5pts
- Dist52wHigh >20%→+7pts, <5%→-5pts

## Google Sheets

- **Document ID**: `1j7ROJwahx68pOOq4XfTNY1r71Q-feR7jbYNPqjwk4wg`
- **Tabs**: Watchlist, Historial, Conservador, Arriesgado, Balanceado, Señales

### Columnas del Sheet (todas necesarias)

```
Fecha | Ticker | Empresa | Sector | Precio | PE | ROE | ProfitMargin | MarketCap |
Beta | DividendYield | EPSGrowth | RSI | Dist52wHigh | DataSource |
filtrado | reason | Sentimiento | Senal | Score | ScoreFund | ScoreTec | Perfil
```

**Columnas eliminadas** (eran debug/inutiles): `RSI_Raw`, `RSI_Source`, `EPS`, `Income`, `Ranking`, `FundamentalScore`, `ScoreSent`, `ScoreSuper`, `TieneSuper`

**Nota**: `Sentimiento` está reservado para futura integración de análisis de noticias — actualmente siempre vale `NEUTRAL`.

## Arquitectura del Workflow (14 nodos)

```
Manual Trigger ─┐
                ├─→ Read Watchlist → Finviz Scrape → Score → Ranking Fundamentals
Schedule ───────┘                                               ↓
                                                         Write Historial
                                                               ↓
                                                         Paso Filtro? (filtrado==true)
                                                           ↓ TRUE
                                                         Switch Profile
                                                        ↙    ↓    ↘
                                              Conservador  Arriesgado  Balanceado
                                                        ↘    ↓    ↙
                                                         If Buy Signal
                                                               ↓ TRUE
                                                         Write Señales
```

**Importante**: El branch FALSE de "Paso Filtro?" NO está conectado a nada — los tickers filtrados no van a Señales.

## Lecciones Técnicas Clave

1. **`}}` crashea el frontend de n8n** — Usar `Object.assign({}, base, extra)` en lugar de spread `{...base, ...extra}` dentro de `results.push({json: ...})`

2. **Finviz: label Dividend dentro de `<a>`** — Requiere `getMetricLinked` que busca `>LABEL</a>` en vez de `>LABEL</td>`

3. **RSI con `$` en algunos tickers** — Ocurre cuando `getMetric` encuentra un `<b>` de precio antes que el de RSI. Fix: parsear siempre con `parseNum` que stripea `$`, y usar `safeRSI` que valida rango 0-100.

4. **Switch Profile `fallbackOutput`** — En n8n 2.36.1 debe ser `"none"` dentro de `options`, no un número.

5. **`addConnection` en IF nodes** — Usar `branch: "true"/"false"` (no `sourceIndex`).
