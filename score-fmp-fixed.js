// Score FMP - Fixed ticker lookup
const finvizFull = [];
try {
  const fv = $('Finviz Extract').all();
  if (Array.isArray(fv)) finvizFull.push(...fv);
} catch(e) { console.log('Finviz Extract error:', e.message); }

const finvizMap = {};
finvizFull.forEach(item => {
  const t = item?.json?._ticker || '';
  if(t) finvizMap[t] = item.json;
});

const checkRsiItems = $('Check RSI').all();
const allProfile = $('FMP Profile').all();
const allRatios = $('FMP Ratios').all();
const allMetrics = $('FMP Metrics').all();

console.log('=== Score FMP Debug ===');
console.log('checkRsiItems:', checkRsiItems.length);
console.log('allProfile:', allProfile.length);
console.log('allRatios:', allRatios.length);
console.log('allMetrics:', allMetrics.length);

const results = [];

const parseNum = val => {
  if(!val || val === '-') return null;
  const c = String(val).replace(/[%,]/g, '');
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
};

// Robust ticker finder - handles multiple response formats
const findByTicker = (arr, ticker) => {
  if (!arr || !Array.isArray(arr)) return { json: {} };

  for (const item of arr) {
    if (!item?.json) continue;
    const j = item.json;

    // Handle array response format from FMP
    if (Array.isArray(j)) {
      const found = j.find(it => it?.symbol === ticker || it?.Ticker === ticker);
      if (found) return { json: found };
    }

    // Handle object with symbol directly
    if (j.symbol === ticker || j.Ticker === ticker || j._ticker === ticker) {
      return item;
    }
  }
  return { json: {} };
};

for(let i = 0; i < checkRsiItems.length; i++) {
  const check = checkRsiItems[i]?.json;
  if(!check) continue;

  if(check._fmpFailed) {
    console.log('Skipping FMP failed:', check._ticker);
    continue;
  }

  const ticker = check._ticker;
  console.log('Processing ticker:', ticker);

  const profile = findByTicker(allProfile, ticker).json || {};
  const ratios = findByTicker(allRatios, ticker).json || {};
  const metrics = findByTicker(allMetrics, ticker).json || {};

  console.log('Profile found:', !!profile?.symbol, 'Sector:', profile?.sector);

  const getFinvizField = field => {
    const fv = finvizMap[ticker] || {};
    const lbls = fv.allLabels || [];
    const vals = fv.allValues || [];
    const idx = lbls.findIndex(l => l?.trim() === field);
    return idx !== -1 ? vals[idx] : null;
  };

  const price = profile.price || parseNum(getFinvizField('Price')) || 0;
  const eps = profile.eps || null;
  let peRatio = ratios.priceToEarningsRatioTTM || null;
  if(!peRatio && eps && price) peRatio = price / eps;
  if(!peRatio) { const peStr = getFinvizField('P/E'); peRatio = parseNum(peStr); }

  const roe = metrics.returnOnEquityTTM || null;
  const profitMargin = ratios.netProfitMarginTTM || null;
  const beta = profile.beta || parseNum(getFinvizField('Beta')) || 1;
  const marketCap = profile.marketCap || parseNum(getFinvizField('Market Cap')) || 0;
  const companyName = profile.companyName || ticker;
  const sector = profile.sector || profile.industry || 'N/A';
  let high52w = price;
  if(profile.range) { const parts = profile.range.split('-'); high52w = parseFloat(parts[1]) || price; }

  const pasaFiltro = (peRatio > 0 && peRatio < 40 && (roe || profitMargin) && marketCap > 500000000);
  if(!pasaFiltro) {
    results.push({ json: { filtrado: false, Ticker: ticker, reason: 'FILTER', DataSource: 'FMP' } });
    continue;
  }

  let scoreFund = 0;
  if(peRatio < 15) scoreFund += 10;
  else if(peRatio < 25) scoreFund += 7;
  else if(peRatio < 40) scoreFund += 5;

  const roeVal = roe !== null ? roe : (parseNum(getFinvizField('ROE')) / 100);
  if(roeVal) {
    if(roeVal > 0.20) scoreFund += 10;
    else if(roeVal > 0.10) scoreFund += 7;
    else if(roeVal > 0.05) scoreFund += 3;
  }

  const pmVal = profitMargin !== null ? profitMargin : (parseNum(getFinvizField('Profit Margin')) / 100);
  if(pmVal) {
    if(pmVal > 0.20) scoreFund += 10;
    else if(pmVal > 0.10) scoreFund += 7;
    else if(pmVal > 0) scoreFund += 3;
  }

  let rsiVal = check._rsiAlpha;
  let rsiSource = check._rsiSource;
  if(rsiVal === null) {
    const rsiStr = getFinvizField('RSI (14)');
    rsiVal = parseNum(rsiStr);
    if(rsiVal !== null) rsiSource = 'Finviz';
  }

  let scoreTec = 0;
  if(rsiVal !== null) {
    if(rsiVal < 30) scoreTec += 18;
    else if(rsiVal < 40) scoreTec += 15;
    else if(rsiVal < 60) scoreTec += 10;
    else if(rsiVal < 70) scoreTec += 5;
  }

  const distHigh = high52w > 0 ? ((high52w - price) / high52w) * 100 : 0;
  if(distHigh > 20) scoreTec += 7;
  else if(distHigh < 5) scoreTec -= 5;

  const total = Math.round(scoreFund + scoreTec + 12.5);
  let senal = 'NEUTRAL';
  if(total >= 80) senal = 'COMPRA FUERTE';
  else if(total >= 60) senal = 'COMPRA';
  else if(total >= 40) senal = 'NEUTRAL';
  else senal = 'EVITAR';

  let perfil = 'Arriesgado';
  if(beta < 1 && marketCap > 10000000000) perfil = 'Conservador';

  results.push({ json: {
    filtrado: true,
    Fecha: new Date().toISOString().split('T')[0],
    Ticker: ticker,
    Empresa: companyName,
    Sector: sector,
    Precio: price,
    PE: peRatio !== null ? Number(peRatio).toFixed(2) : 'N/A',
    ROE: roeVal !== null ? (roeVal * 100).toFixed(2) + '%' : 'N/A',
    ProfitMargin: pmVal !== null ? (pmVal * 100).toFixed(2) + '%' : 'N/A',
    MarketCap: (marketCap / 1e9).toFixed(2) + 'B',
    Beta: Number(beta).toFixed(2),
    RSI: rsiVal !== null ? Number(rsiVal).toFixed(2) : 'N/A',
    RSI_Source: rsiSource,
    Dist52wHigh: distHigh.toFixed(1) + '%',
    Sentimiento: 'NEUTRAL',
    TieneSuper: 'N/A',
    Senal: senal,
    Score: total,
    Perfil: perfil,
    DataSource: 'FMP+Finviz'
  }});
}

console.log('Results:', results.length);
return results;
