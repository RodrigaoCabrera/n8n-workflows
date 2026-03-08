# Proyecto: Automatización de Selección de Acciones

## Objetivo

Workflow n8n que automatiza la selección de acciones para inversión, generando 20 recomendaciones diarias (10 conservador + 10 arriesgado) en Google Sheets.

## Estrategia de Inversión (5 Pasos)

### Paso 1: FILTRAR (≈Finviz)

- **API**: Financial Modeling Prep `/stock-screener`
- **Filtros**:
  - P/E Ratio < 40
  - EPS Growth > 30%
  - Net Profit Margin > 0%
  - ROE > 5%
  - Exchange: NYSE, NASDAQ
  - Market Cap > $500M

### Paso 2: COMPARAR (≈Google Finance)

- **API**: FMP `/profile/{symbol}` + `/ratios/{symbol}`
- **Métricas**: Net Income, EPS, Beta, Sector, Market Cap
- Comparar rentabilidad entre empresas candidatas

### Paso 3: MOMENTO DE COMPRA (≈TradingView)

- **API**: Alpha Vantage RSI + SMA
- **Señales**:
  - RSI < 30 = Sobreventa (oportunidad)
  - RSI > 70 = Sobrecompra (cuidado)
  - SMA50 > SMA200 = Tendencia alcista

### Paso 4: EXPECTATIVAS (≈SeekingAlpha)

- **API**: FMP `/stock_news?tickers={symbol}`
- Analizar últimas 5 noticias
- Clasificar: Positivo / Negativo / Neutral

### Paso 5: CONFIRMAR CON LOS GRANDES (≈Dataroma)

- **API**: FMP `/institutional-holder/{symbol}`
- Verificar presencia en portfolios de superinversores
- Buffett, Ackman, Icahn, Soros, etc.
- Bonus: +20 puntos si está en portfolio de superinversor

## Perfiles de Riesgo

### Conservador (Tab 1 - 10 acciones)

| Criterio | Valor |
|----------|-------|
| Market Cap | > $10B (Large Cap) |
| Beta | < 1.0 |
| Dividend Yield | > 0% (preferible) |
| RSI | 30-65 |

### Arriesgado (Tab 2 - 10 acciones)

| Criterio | Valor |
|----------|-------|
| Market Cap | $500M - $50B |
| Beta | >= 1.0 |
| EPS Growth | > 40% |
| RSI | Cualquiera |

## Sistema de Scoring (0-100)

- Fundamentales: 30%
- Técnico: 25%
- Sentimiento: 25%
- Superinversores: 20%

## APIs Requeridas

### Financial Modeling Prep

- **URL**: <https://site.financialmodelingprep.com/>
- **Límite**: 250 calls/día gratis
- **API Key**: `WzqQBQScYqY4OgaCUZwa5re5NBWVyyBK`
- **Endpoints usados**:
  - `/stable/profile?symbol=XXX` - Datos básicos, precio, beta, marketCap
  - `/stable/ratios-ttm?symbol=XXX` - P/E, margins, EPS
  - `/stable/key-metrics-ttm?symbol=XXX` - ROE

### Alpha Vantage

- **URL**: <https://www.alphavantage.co/>
- **Límite**: 25 calls/día gratis
- **API Key**: `42J2QW442HR440NZ`
- **Endpoints usados**:
  - `RSI` - Relative Strength Index
  - `SMA` - Simple Moving Average

### Google Sheets

- **Document ID**: `1j7ROJwahx68pOOq4XfTNY1r71Q-feR7jbYNPqjwk4wg`
- **Tabs**: Conservador, Arriesgado, Historial

## Output

- Google Sheets con 3 tabs: `Conservador`, `Arriesgado`, `Historial`
- Ejecución: Diaria 8AM (lunes-viernes) + Manual on-demand
- Creacion de header de sheet automaticamente. El sheet inicialmete estara vacio

## Workflow Actual

- **ID n8n**: `aRJpQ33RYDAzppia`
- **Nombre**: `FLOW-stock-screener-v4-RSI-COMPLETO`
- **Estado**: Funcional con estrategia completa de 5 pasos
- **RSI**: Dual approach (Alpha Vantage API + cálculo manual con FMP histórico)

## Plan Detallado

Ver archivo completo: `~/.claude/plans/luminous-puzzling-ritchie.md`

## Pendiente: Scraping como fallback a APIs con límite

### Problema

- FMP tiene límite de 250 calls/día (plan gratis), cuando se alcanza retorna "Limit Reach"
- Alpha Vantage tiene límite de 25 calls/día
- Yahoo Finance cerró sus APIs no-oficiales (retorna 401)

### Solución aprobada: Opción 3 - Híbrida

- **Fuente principal**: APIs de FMP + Alpha Vantage
- **Fallback scraping**: Finviz (`https://finviz.com/quote.ashx?t=TICKER`)
- **Método**: HTTP Request (con User-Agent navegador) + HTML Extract (CSS selectors)
- **Datos en Finviz**: PE, EPS, ROE, Profit Margin, Beta, Market Cap, RSI, 52w High/Low, SMA20/50/200
- **Nodos n8n**: Solo core (HTTP Request + HTML Extract), NO community nodes
- **Estado**: Pendiente de implementación - probar primero que Finviz responde desde n8n
