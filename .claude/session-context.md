# Contexto de sesión - Stock Screener Automatizado

## Qué se estaba construyendo

Workflow n8n para screening automático de acciones financieras.

- Proyecto: `StockScreenerAutomatizado-Conservador`
- Ruta: `D:\inside-projects\n8n-workflows`
- El workflow lee tickers desde Google Sheets, consulta APIs financieras, calcula scores y escribe resultados en Google Sheets separando en conservadores/arriesgados y señales de compra.

## Nodos del workflow (22 en total)

- **Manual Trigger** / **Schedule Weekly Monday 8AM** → triggers
- **Read Watchlist** → lee tickers desde Google Sheets (lee bien los 8 tickers)
- **FMP Profile** → API Financial Modeling Prep (recibe 8 pero solo devuelve 7 - BUG PENDIENTE)
- **FMP Ratios** → API FMP
- **FMP Metrics** → API FMP (a veces devuelve `{}` vacíos)
- **Enrich with Ticker** → nodo Code, marca `_fmpFailed: true` cuando FMP falla
- **FMP Fallo?** → IF que separa tickers con datos vs fallidos
- **Alpha Vantage RSI** → API RSI (límite 25 req/día en plan gratuito, solo devuelve 4 items)
- **Check RSI** → nodo Code
- **Finviz RSI Scrape** / **Finviz RSI Extract** → fallback de RSI cuando Alpha Vantage falla
- **Finviz Scrape** / **Finviz Extract** → fallback de datos cuando FMP falla
- **Score FMP** → nodo Code principal (tenía bugs críticos)
- **Score Finviz** → nodo Code para tickers que fallaron en FMP (tenía bugs críticos)
- **Paso Filtro?** / **Is Conservador?** / **Is Buy Signal?** → IFs de clasificación
- **Write Conservador** / **Write Arriesgado** / **Write Señales** → escribe en Google Sheets

## Problemas resueltos

- FMP Metrics devolvía `{}` → se agregó detección con `_fmpFailed` y fallback a Finviz
- Tickers duplicados en el sheet → Score FMP y Score Finviz procesaban todos los tickers sin filtrar
- Datos cruzados (PFE mostraba "The Coca-Cola Company") → causa: lookup por índice de posición en vez de por ticker
- Score FMP y Score Finviz usaban lookup por posición → reemplazado por función `findByTicker()` que busca por `symbol`/`Ticker`/`_ticker`
- "Cannot return primitive values directly" → nodos Code ahora devuelven siempre `[{json:{...}}]`
- Brackets desbalanceados en jsCode → corregidos

## Bugs pendientes al cortar la sesión

1. **FMP Profile pierde 1 ticker**: recibe 8, devuelve 7. Causa desconocida, no investigada.
2. **Alpha Vantage RSI alcanza límite**: solo devuelve 4 items (mensaje de rate limit del plan gratuito). Los 4 tickers restantes quedan sin RSI en el sheet.
3. **Tickers sin Sector ni RSI en el sheet**: relacionado con el bug de Alpha Vantage.
4. **Validación del workflow seguía fallando** al cortar la sesión por context overflow.

## Por qué se cortó la sesión

El modelo alcanzó el límite de contexto ("prompt too long; exceeded max context length"). La sesión terminó sin resolver los bugs pendientes.

## Estado del archivo JSON

El workflow fue modificado múltiples veces durante la sesión. El último estado guardado es `FLOW-stock-screener-v4-RSI-COMPLETO.json` pero puede no reflejar los últimos cambios aplicados antes del corte.

## Próximos pasos

1. Validar el workflow actual con `n8n_validate_workflow`
2. Investigar por qué FMP Profile pierde 1 ticker
3. Resolver el fallback de RSI cuando Alpha Vantage falla por rate limit (usar Finviz RSI para todos)
4. Confirmar que Score FMP usa `findByTicker()` y no lookup por posición
5. Verificar que los datos en el sheet son correctos (empresa, sector, RSI) para todos los tickers


---
## Sesion 2026-02-21 21:05
## Resumen de Sesión de Trabajo

### Que se estaba construyendo:
- **Stock Screener automatizado** con n8n (basado en resúmenes de sesiones previas)
- Integración con APIs de mercado financiero (FMP Profile, Alpha Vantage)
- Hoja de cálculo con datos de acciones

### Que esta completado:
- Nada significativo en esta sesión
- El asistente identificó el problema de conexión con n8n

### Que falta hacer:
- **Iniciar n8n** en la máquina local (`http://localhost:5678`)
- Validar el workflow actual de stock screener
- Investigar bugs pendientes:
  - FMP Profile pierde 1 ticker
  - Alpha Vantage rate limit
- Verificar datos en la hoja de cálculo

### Decisiones tecnicas importantes:
- Se requiere que n8n esté ejecutándose y con la API habilitada para continuar con el desarrollo

### Archivos y rutas clave:
- Directorio de trabajo: `D:\inside-projects\n8n-workflows`
- Puerto de n8n: `localhost:5678`

---

**Nota:** La sesión fue muy corta (se solicitó exit inmediatamente después de recibir la notificación del problema). No se tomaron decisiones técnicas adicionales.