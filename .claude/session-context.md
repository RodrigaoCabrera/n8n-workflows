# Session Context

## Sesion 2026-03-08

### Que se hizo

- **Score node v8→v10** deployado en workflow `aRJpQ33RYDAzppia`
- **Fix RSI con `$`**: `rsiVal` es el float parseado (via `safeRSI(parseNum(rsiStr))`), nunca se guarda el string crudo. Solucionado definitivamente.
- **Fix Dividend TTM**: Label está dentro de `<a>` en el HTML de Finviz, no directo en `<td>`. Agregada función `getMetricLinked` que busca `>LABEL</a>` en lugar de `>LABEL</td>`. Formato `1.72 (6.36%)` parseado con regex `\(([\d.]+)%\)`.
- **Señales solo para tickers que pasan filtro**: Branch FALSE de "Paso Filtro?" ya no conecta a "If Buy Signal". BABA con RSI 21.46 no aparece en Señales porque `EPS_GROWTH=8.7%` (necesita >10%).
- **Reason con valor exacto**: Ahora muestra `EPS_GROWTH=8.7% | ROE=4.2%` en lugar de solo el nombre del criterio.
- **Columnas limpiadas**: Eliminadas `RSI_Raw`, `ScoreSent`, `ScoreSuper`, `TieneSuper`, `EPS`, `Income`, `Ranking`, `FundamentalScore` del output.
- **Script local `score-fmp-fixed.js`**: Testeado contra `Historial.csv` — valida scoring, perfiles y señales offline.

### Columnas finales del sheet (23 columnas)

```
Fecha, Ticker, Empresa, Sector, Precio, PE, ROE, ProfitMargin, MarketCap,
Beta, DividendYield, EPSGrowth, RSI, Dist52wHigh, DataSource,
filtrado, reason, Sentimiento, Senal, Score, ScoreFund, ScoreTec, Perfil
```

### Estado actual del workflow

- Conservador: vacío si ningún ticker paga dividendo (watchlist tech-heavy)
- Arriesgado: ADBE cuando pasa filtro con beta >= 1.15 y EPSGrowth > 20%
- Balanceado: MSFT, CRM, QCOM (los que pasan filtro pero no encajan en los otros perfiles)
- Señales: solo tickers con `filtrado=true` y RSI < 40

### Pendiente

- Verificar que DividendYield ahora extrae correctamente (PFE ~6.36%, DEO ~4.7%) ejecutando el workflow
- `Sentimiento` siempre NEUTRAL — pendiente integración de análisis de noticias (FMP `/stock_news`)
- Superinversores pendiente — `ScoreSent` y `ScoreSuper` siempre 0 hasta implementar

---

## Sesion 2026-03-25

### Que se hizo

**Proyecto**: Workflow de facturación electrónica de exportación via AFIP/ARCA.

- **Workflow creado y funcional**: `Factura - Arca` (ID: `52jg5Zl4ffolQ1Fq`), 15 nodos, activo en n8n
- **Simplificado a WSFEX-only**: se eliminó todo el código WSFE del plan original — el workflow solo crea Facturas E (exportación)
- **Bugs críticos resueltos** (en orden):
  1. `FEXGetLast_CMP` error 1606 — `Pto_venta` y `Cbte_Tipo` debían ir DENTRO de `Auth` (WSFEX-specific, distinto a WSFE)
  2. Cotizacion invalida — `FchCotiz` se enviaba como `YYYYMMDD` pero AFIP requiere `YYYY-MM-DD` con guiones
  3. `Cmps_asoc` — array vacío `[]` se serializa en SOAP sin elemento hijo; solución: omitir el campo completamente
  4. `Permiso_existente: 'N'` inválido para `Tipo_expo=2` — debe ser `''` (vacío)
- **Carpeta `arca-invoice/` ordenada**: eliminados 11 archivos temp/scratch, scripts movidos a `service/`, documentación en `docs/`
- **Scripts de setup** en `service/`: `create-cert.js`, `auth-webservice.js`, `test-credentials.js`

### Estado actual del workflow

- **Funcional en ambiente `dev`** (homologación): genera CAE real de prueba
- Trigger: formulario con campos `client_name`, `description`, `amount`, `quantity`, `client_country`, `client_address`, `client_tax_id`, `payment_method`
- Cotización USD obtenida dinámicamente de AFIP via `FEXGetPARAM_Ctz` (día habil anterior)
- 10 países soportados en el mapeo `Dst_cmp` / `Cuit_pais_cliente`

### Pendiente

- Pasar `ENVIRONMENT` de `'dev'` a `'production'` en `issuer_config` cuando el certificado de producción esté listo
- Validar que el PDF generado (`create_pdf`) sea correcto
- Agregar más países al mapeo si se necesita
