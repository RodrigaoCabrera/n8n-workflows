/**
 * AFIP WSFEX Parameter Query Tool
 *
 * Queries reference data from AFIP's WSFEX service:
 *   - FEXGetPARAM_PtoVenta  → valid sale points for your CUIT
 *   - FEXGetPARAM_DST_pais  → destination countries (codes + names)
 *   - FEXGetPARAM_DST_CUIT  → country CUITs (for Cuit_pais_cliente field)
 *
 * Use this to:
 *   1. Confirm your PUNTO_VTA value in issuer_config
 *   2. Get the correct Cuit_pais_cliente for each country in build_voucher
 *
 * Run (PowerShell):
 *   $env:AFIP_SDK_TOKEN = "tu-token"
 *   $env:AFIP_CUIT      = "20400832278"
 *   $env:AFIP_ENV       = "production"   # or "dev"
 *   node query-params.js
 */

import 'dotenv/config';
import https from 'https';

const SDK_TOKEN = process.env.AFIP_SDK_TOKEN;
const CUIT      = process.env.AFIP_CUIT      || '20400832278';
const ENV       = process.env.AFIP_ENV        || 'production';
const BASE_URL  = 'https://app.afipsdk.com/api/v1/afip/requests';

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------
if (!SDK_TOKEN) {
  console.error('\n❌ AFIP_SDK_TOKEN not set.');
  console.error('   $env:AFIP_SDK_TOKEN = "tu-token"\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url  = new URL(BASE_URL);
    const req  = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization':  `Bearer ${SDK_TOKEN}`,
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Auth helper — gets token+sign for the CUIT (requires prod cert in issuer_config)
// For query purposes use the afipsdk auth endpoint directly
// ---------------------------------------------------------------------------
async function getAuth() {
  const res = await fetch('https://app.afipsdk.com/api/v1/afip/auth', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SDK_TOKEN}`,
    },
    body: JSON.stringify({ environment: ENV, tax_id: CUIT, wsid: 'wsfex' }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return { Token: data.token, Sign: data.sign, Cuit: parseInt(CUIT) };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
async function queryPtoVenta(auth) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FEXGetPARAM_PtoVenta — Valid sale points for CUIT', CUIT);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const res = await post({
    environment: ENV, method: 'FEXGetPARAM_PtoVenta', wsid: 'wsfex',
    params: { Auth: auth },
  });
  const items = res.body?.FEXGetPARAM_PtoVentaResult?.ResultGet?.ClsFEXResponse_PtoVenta;
  if (!items) {
    console.log('  ⚠️  No data —', JSON.stringify(res.body).slice(0, 400));
    return;
  }
  const list = Array.isArray(items) ? items : [items];
  console.log(`  Found ${list.length} sale point(s):\n`);
  list.forEach(p => {
    console.log(`  • Nro: ${p.Nro}  |  Bloqueado: ${p.Bloqueado}  |  FchDesde: ${p.FchDesde}`);
  });
  console.log('\n  ➜ Use one of these values as PUNTO_VTA in issuer_config.');
}

async function queryDstPais(auth) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FEXGetPARAM_DST_pais — Destination countries');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const res = await post({
    environment: ENV, method: 'FEXGetPARAM_DST_pais', wsid: 'wsfex',
    params: { Auth: auth },
  });
  const items = res.body?.FEXGetPARAM_DST_paisResult?.ResultGet?.ClsFEXResponse_DST_pais;
  if (!items) {
    console.log('  ⚠️  No data —', JSON.stringify(res.body).slice(0, 400));
    return;
  }
  const list = Array.isArray(items) ? items : [items];
  console.log(`  Found ${list.length} countries. Sample (first 20):\n`);
  list.slice(0, 20).forEach(c => {
    console.log(`  • Codigo: ${String(c.DST_Codigo).padStart(4)}  |  ${c.DST_Ds}`);
  });
  if (list.length > 20) console.log(`  ... and ${list.length - 20} more`);
}

async function queryDstCuit(auth) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  FEXGetPARAM_DST_CUIT — Country CUITs (Cuit_pais_cliente)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const res = await post({
    environment: ENV, method: 'FEXGetPARAM_DST_CUIT', wsid: 'wsfex',
    params: { Auth: auth },
  });
  const items = res.body?.FEXGetPARAM_DST_CUITResult?.ResultGet?.ClsFEXResponse_DST_cuit;
  if (!items) {
    console.log('  ⚠️  No data —', JSON.stringify(res.body).slice(0, 400));
    return;
  }
  const list = Array.isArray(items) ? items : [items];
  console.log(`  Found ${list.length} country CUIT entries:\n`);
  list.forEach(c => {
    console.log(`  • CUIT: ${String(c.DST_CUIT_nro).padEnd(15)}  |  ${c.DST_CUIT_nombre}`);
  });
  console.log('\n  ➜ Use DST_CUIT_nro as cuit and DST_CUIT_nombre as nombre');
  console.log('     in the COUNTRIES map in build_voucher.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n========================================================');
  console.log('  AFIP WSFEX Parameter Query Tool');
  console.log(`  CUIT:        ${CUIT}`);
  console.log(`  Environment: ${ENV}`);
  console.log('========================================================');

  console.log('\n  Getting auth token...');
  let auth;
  try {
    auth = await getAuth();
    console.log('  ✅ Auth OK');
  } catch (e) {
    console.error('\n  ❌ Auth failed:', e.message);
    console.error('  Make sure your production cert/key is set in issuer_config');
    console.error('  and AFIP_SDK_TOKEN is correct.\n');
    process.exit(1);
  }

  await queryPtoVenta(auth);
  await queryDstPais(auth);
  await queryDstCuit(auth);

  console.log('\n========================================================\n');
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
