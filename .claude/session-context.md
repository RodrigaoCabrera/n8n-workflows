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
