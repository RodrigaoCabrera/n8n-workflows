/**
 * score-fmp-fixed.js
 * Tests score logic against Historial.csv
 * Run: node score-fmp-fixed.js
 */

const fs = require('fs');
const path = require('path');

// ─── Parse CSV ────────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cols = [];
    let inQuote = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (cols[i] || '').trim(); });
    return row;
  });
}

// ─── Clean numeric value (strips $, %, B, M, commas) ─────────────────────────
function parseNum(val) {
  if (!val || val === 'N/A' || val === '' || val === '-') return null;
  const cleaned = String(val).replace(/[$\s]/g, '').replace(/%$/, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseMarketCap(val) {
  if (!val || val === 'N/A') return null;
  const s = String(val).replace(/[$,\s]/g, '');
  const num = parseFloat(s);
  if (isNaN(num)) return null;
  // MarketCap in CSV is stored as "3036.79B", "116.43B", etc.
  if (s.endsWith('T')) return num * 1000;
  if (s.endsWith('B')) return num;
  if (s.endsWith('M')) return num / 1000;
  return num / 1e9;
}

// ─── RSI: prefer RSI_Raw (clean), fallback to RSI (strip $) ──────────────────
function getRSI(row) {
  const raw = parseNum(row['RSI_Raw']);
  if (raw !== null) return raw;
  return parseNum(row['RSI']);
}

// ─── Fundamental filter ───────────────────────────────────────────────────────
function filterStock(row) {
  const pe = parseNum(row['PE']);
  const roe = parseNum(row['ROE']);
  const profitMargin = parseNum(row['ProfitMargin']);
  const epsGrowth = parseNum(row['EPSGrowth']);

  const reasons = [];
  if (pe !== null && pe > 40) reasons.push('PE');
  if (roe !== null && roe < 5) reasons.push('ROE');
  if (profitMargin !== null && profitMargin <= 0) reasons.push('PROFIT_MARGIN');
  if (epsGrowth !== null && epsGrowth < 10) reasons.push('EPS_GROWTH');

  return { passed: reasons.length === 0, reasons };
}

// ─── Profile assignment ───────────────────────────────────────────────────────
function assignProfile(row, passed) {
  if (!passed) return 'FILTRADO';

  const mc = parseMarketCap(row['MarketCap']);
  const beta = parseNum(row['Beta']);
  const dividend = parseNum(row['DividendYield']);
  const epsGrowth = parseNum(row['EPSGrowth']);
  const rsi = getRSI(row);

  // Conservador: Large cap >10B, low beta <1.0, pays dividend, RSI in safe zone
  const isConservador = mc !== null && mc >= 10
    && beta !== null && beta < 1.0
    && dividend !== null && dividend > 0
    && rsi !== null && rsi >= 30 && rsi <= 65;

  // Arriesgado: high beta, strong EPS growth
  const isArriesgado = beta !== null && beta >= 1.0
    && epsGrowth !== null && epsGrowth > 20;

  if (isConservador) return 'Conservador';
  if (isArriesgado) return 'Arriesgado';
  return 'Balanceado';
}

// ─── Buy signal ───────────────────────────────────────────────────────────────
function getBuySignal(row) {
  const rsi = getRSI(row);
  if (rsi === null) return 'SIN_RSI';
  if (rsi < 30) return 'COMPRA';
  if (rsi > 70) return 'ESPERAR';
  return 'NEUTRAL';
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function scoreStock(row) {
  const pe = parseNum(row['PE']);
  const roe = parseNum(row['ROE']);
  const profitMargin = parseNum(row['ProfitMargin']);
  const rsi = getRSI(row);

  // Fundamentals (30 pts)
  let scoreFund = 0;
  if (pe !== null) scoreFund += pe < 15 ? 10 : pe < 25 ? 7 : pe < 35 ? 4 : 1;
  if (roe !== null) scoreFund += roe > 30 ? 10 : roe > 15 ? 7 : roe > 5 ? 4 : 1;
  if (profitMargin !== null) scoreFund += profitMargin > 25 ? 10 : profitMargin > 10 ? 7 : profitMargin > 0 ? 4 : 0;

  // Technical (25 pts) — RSI
  let scoreTec = 0;
  if (rsi !== null) {
    if (rsi < 30) scoreTec += 25;
    else if (rsi < 40) scoreTec += 20;
    else if (rsi < 50) scoreTec += 15;
    else if (rsi < 60) scoreTec += 10;
    else if (rsi < 70) scoreTec += 5;
    else scoreTec += 0;
  }

  // Sentiment (25 pts)
  const sent = (row['Sentimiento'] || '').toUpperCase();
  const scoreSent = sent === 'POSITIVO' ? 25 : sent === 'NEUTRAL' ? 12 : 0;

  // Super investors (20 pts)
  const tieneSuper = row['TieneSuper'];
  const scoreSuper = (tieneSuper === 'SI' || tieneSuper === 'true') ? 20 : 0;

  const total = Math.min(100, scoreFund + scoreTec + scoreSent + scoreSuper);
  return { total, scoreFund, scoreTec, scoreSent, scoreSuper };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const csvPath = path.join(__dirname, 'Historial.csv');
const rows = parseCsv(csvPath);

console.log('='.repeat(70));
console.log('STOCK SCREENER - SCORE TEST');
console.log('='.repeat(70));

const conservador = [];
const arriesgado = [];
const balanceado = [];
const senales = [];

for (const row of rows) {
  const ticker = row['Ticker'];
  const { passed, reasons } = filterStock(row);
  const profile = assignProfile(row, passed);
  const signal = getBuySignal(row);
  const scores = scoreStock(row);
  const rsi = getRSI(row);

  const result = Object.assign({}, {
    ticker,
    empresa: row['Empresa'],
    sector: row['Sector'],
    precio: row['Precio'],
    pe: parseNum(row['PE']),
    roe: parseNum(row['ROE']),
    profitMargin: parseNum(row['ProfitMargin']),
    marketCap: row['MarketCap'],
    beta: parseNum(row['Beta']),
    dividendYield: parseNum(row['DividendYield']),
    epsGrowth: parseNum(row['EPSGrowth']),
    rsi,          // clean RSI, no $ symbol
    dist52wHigh: parseNum(row['Dist52wHigh']),
    filtrado: passed,
    reasons: passed ? 'PASSED' : reasons.join(', '),
    signal,
    profile,
  }, scores);

  // Route to profile tabs (only if passed filter)
  if (passed) {
    if (profile === 'Conservador') conservador.push(result);
    else if (profile === 'Arriesgado') arriesgado.push(result);
    else balanceado.push(result);
  }

  // Señales: ALL tickers with COMPRA signal (regardless of fundamental filter)
  if (signal === 'COMPRA') senales.push(result);

  const rsiStr = rsi !== null ? rsi.toFixed(2) : 'N/A';
  const filtStr = passed ? 'PASA  ' : `FILTRA(${result.reasons})`;
  console.log(`${ticker.padEnd(6)} | RSI:${rsiStr.padStart(6)} | ${signal.padEnd(7)} | ${profile.padEnd(12)} | Score:${String(scores.total).padStart(3)} | ${filtStr}`);
}

// ─── Results summary ──────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log('TAB CONSERVADOR:', conservador.length ? conservador.map(r => r.ticker).join(', ') : '(vacío)');
console.log('TAB ARRIESGADO: ', arriesgado.length ? arriesgado.map(r => r.ticker).join(', ') : '(vacío)');
console.log('TAB BALANCEADO: ', balanceado.length ? balanceado.map(r => r.ticker).join(', ') : '(vacío)');
console.log('TAB SEÑALES:    ', senales.length ? senales.map(r => `${r.ticker}(RSI:${r.rsi.toFixed(2)})`).join(', ') : '(vacío)');

// ─── Conservador diagnosis ────────────────────────────────────────────────────
if (conservador.length === 0) {
  console.log('\nCONSERVADOR VACIO - Diagnóstico por ticker que pasa filtro:');
  for (const row of rows) {
    const { passed } = filterStock(row);
    if (!passed) continue;
    const mc = parseMarketCap(row['MarketCap']);
    const beta = parseNum(row['Beta']);
    const div = parseNum(row['DividendYield']);
    const rsi = getRSI(row);
    const ticker = row['Ticker'];
    const issues = [];
    if (!mc || mc < 10) issues.push(`MarketCap=${mc?.toFixed(0)}B < 10B`);
    if (beta === null || beta >= 1.0) issues.push(`Beta=${beta} >= 1.0`);
    if (!div || div <= 0) issues.push(`DividendYield=${div}% (no paga dividendo o no extraído)`);
    if (rsi === null || rsi < 30 || rsi > 65) issues.push(`RSI=${rsi} fuera de [30,65]`);
    console.log(`  ${ticker}: ${issues.length ? issues.join(' | ') : 'OK'}`);
  }
}

// ─── Field analysis ───────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log('CAMPOS A ELIMINAR DEL SHEET (no aportan valor):');
const toRemove = [
  { field: 'RSI_Source',      reason: 'Siempre vacío — no se usa' },
  { field: 'EPS',             reason: 'EPS crudo no se usa en scoring; solo importa EPSGrowth %' },
  { field: 'Income',          reason: 'No se usa en scoring; tamaño cubierto por MarketCap' },
  { field: 'Ranking',         reason: 'Número secuencial de fila, no es señal de calidad' },
  { field: 'FundamentalScore',reason: 'Duplicado de ScoreFund — redundante' },
];
toRemove.forEach(f => console.log(`  ✗ ${f.field.padEnd(18)} → ${f.reason}`));

console.log('\nCAMPOS UTILES (conservar):');
const toKeep = [
  'Fecha','Ticker','Empresa','Sector','Precio',
  'PE','ROE','ProfitMargin','MarketCap','Beta','DividendYield','EPSGrowth',
  'RSI','Dist52wHigh','DataSource',
  'filtrado','reason','Sentimiento','TieneSuper','Senal',
  'Score','ScoreFund','ScoreTec','ScoreSent','ScoreSuper','Perfil',
];
console.log('  ', toKeep.join(', '));
console.log('\nNOTA: RSI_Raw se usa internamente para limpiar RSI pero no necesita columna propia en el Sheet');
