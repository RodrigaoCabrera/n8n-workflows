# Resumen Compactado: Stock Screener Automatizado

## Proyecto

- **Nombre**: StockScreenerAutomatizado-Conservador
- **Ruta**: D:\inside-projects\n8n-workflows
- **URL n8n**: <http://localhost:5678>
- **Workflow**: FLOW-stock-screener-v4-RSI-COMPLETO (ID: aRJpQ33RYDAzppia)

## Estado Actual

- **n8n**: Corriendo y conectado
- **Workflow**: Parcialmente funcional con errores pendientes
- **Tickers**: 8 en watchlist (BABA, QCOM, ATT, PFE, KO, MCD, NKE, DEO)
- **Resultado**: Solo 5-7 tickers se procesan correctamente

---

## Decisiones Técnicas Implementadas

| Problema | Solución |
|----------|----------|
| FMP Metrics devolvía '{}' | Detección con '_fmpFailed' + fallback a Finviz |
| Datos cruzados (PFE → Coca-Cola) | Reemplazado lookup por índice → función findByTicker() |
| "Cannot return primitive values" | Nodos Code ahora devuelven '[{json:{...}}]' |
| Brackets desbalanceados | Corregidos en Score FMP y Score Finviz |

---

## Bugs Pendientes

### Críticos

1. **FMP Profile pierde 1 ticker** — Recibe 8, devuelve 7 (causa desconocida)
2. **Alpha Vantage RSI rate limit** — Solo devuelve 4-5 items (límite plan gratuito)
3. **403/429 en Finviz** — IP bloqueada o rate limit alcanzado

### Pendientes de Investigación

- Por qué 3 tickers (KO, QCOM, NKE, MCD, DEO) no llegan al nodo final
- Sospecha: batchSize: 5 en FMP Profile
- Error "No property named data exists" en nodo Extract de Finviz

---

## Archivos Clave

- **Workflow JSON**: FLOW-stock-screener-v4-RSI-COMPLETO.json
- **Última ejecución**: ID 2020
- **Google Sheets**: Watchlist (8 tickers) + resultados

---

## Próximos Pasos

1. Investigar pérdida de ticker en FMP Profile
2. Implementar fallback completo de RSI (Finviz para todos)
3. Resolver errores 403/429 de Finviz (cambiar IP o esperar)
4. Validar workflow con n8n_validate_workflow
5. Verificar datos finales en sheet (empresa, sector, RSI)

---

## Sesion 2026-02-23 18:34

## Que se estaba construyendo

Sistema de scraping de datos de acciones (RSI, Sector) desde Finviz para un workflow de n8n que procesa 8 tickers.

## Que esta completado

- Workflow con 8 tickers siendo procesados
- Se agregó código para preservar el ticker en el flujo

## Que falta hacer

- Resolver el error 403 de Finviz que está bloqueando el scraping
- Obtener datos de RSI y Sector que no llegan

## Decisiones tecnicas importantes

- Finviz está retornando 403 (bloqueo)
- El usuario verificó que una request GET simple '<https://finviz.com/quote.ashx?t=BABA&ty=c&ta=1&p=d>' sin headers debería funcionar
- Se elimino toda dependencia a las APIs, solo scrapping

## Archivos y rutas clave

- Nodo Finviz Scrape en n8n
- Nodo Finviz Extract
- Nodo Score

---

## Sesion 2026-02-23 20:48

## Que se estaba construyendo

Un workflow de n8n para hacer scraping de datos financieros de Finviz (tablas con datos de acciones). El objetivo era obtener los datos de la tabla deFinviz para procesarlos posteriormente.

## Que esta completado

- Se identificó que el problema principal es Cloudflare bloqueando las requests automatizadas
- Se probó HTTP Request con headers personalizados (no funcionó)
- Se intentó usar Code node con $helpers.httpRequest() pero falló porque $helpers no está definido
- Se creó el workflow de prueba TEST-Finviz-JinaAI usando Jina.ai como alternativa

## Que falta hacer

- Obtener los datos de Finviz de forma confiable
- El bloqueo de Jina.ai dura hasta ~00:14 GMT del 24 feb 2026
- Opciones pendientes: esperar, usar FMP (Financial Modeling Prep), o configurar Airtop

## Decisiones tecnicas importantes

- Cloudflare bloquea requests automatizadas desde la IP de n8n
- Jina.ai también fue bloqueado por "abuuso detectado" (DDoS sospechoso)
- Se identificó Airtop como la solución más robusta pero requiere credencial
- Se mencionó FMP como alternativa ya configurada previamente

## Archivos y rutas clave

- Workflow de prueba: TEST-Finviz-JinaAI (ID: Pe6yJGYXtXIvk4RA)
- UI de n8n: <http://localhost:5678>
- Endpoint Jina.ai: <https://r.jina.ai/{URL}>

## Bugs pendientes

- Cloudflare bloqueando Finviz
- Jina.ai bloqueado por abuso hasta Tue Feb 24 2026 00:14:40 GMT+0000
- $helpers no disponible en Code node de n8n

---
