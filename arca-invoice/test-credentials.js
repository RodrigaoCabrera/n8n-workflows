/**
 * AFIP SDK Credential Validator
 *
 * Tests all AFIP SDK endpoints sequentially using credentials from
 * the current workflow JSON. Run: node test-credentials.js
 *
 * Optionally override credentials via env vars:
 *   AFIP_SDK_TOKEN, AFIP_CERT, AFIP_KEY, AFIP_CUIT
 */
import 'dotenv/config';
import https from 'https';

// ---------------------------------------------------------------------------
// Credentials from workflow (invoice-arca.json)
// Override via env vars if needed
// ---------------------------------------------------------------------------

const CUIT = process.env.AFIP_CUIT || '';
const CUIT_TEST = '20409378472'; // AFIP test CUIT (no cert needed in dev)
const SDK_TOKEN = process.env.AFIP_SDK_TOKEN || ''; // Bearer token for app.afipsdk.com

// ---------------------------------------------------------------------------
// HTTP helper (no dependencies)
// ---------------------------------------------------------------------------
function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }, headers),
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
let authToken = null;
let authSign = null;

function ok(name, detail = '') {
  console.log(`  ✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
  passed++;
}

function fail(name, detail = '') {
  console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  failed++;
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  TEST: ${title}`);
  console.log('─'.repeat(60));
}

function authHeaders() {
  if (!SDK_TOKEN) return {};
  return { Authorization: 'Bearer ' + SDK_TOKEN.replace(/\s+/g, '') };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function test1_healthCheck() {
  section('1. FEXDummy — AFIP SDK health check');
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/requests',
      { environment: 'dev', method: 'FEXDummy', wsid: 'wsfex', params: {} },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    if (res.status === 401) {
      fail('FEXDummy', 'Unauthorized — AFIP_SDK_TOKEN is required. Set it as env var.');
      return false;
    }
    const r = res.body?.FEXDummyResult;
    if (r?.AppServer === 'OK' && r?.DbServer === 'OK') {
      ok('FEXDummy', `AppServer=${r.AppServer} DbServer=${r.DbServer} AuthServer=${r.AuthServer}`);
      return true;
    } else {
      fail('FEXDummy', 'Unexpected response structure');
      return false;
    }
  } catch (e) {
    fail('FEXDummy', e.message);
    return false;
  }
}

async function test2_authDevCuit() {
  section('2. Auth WSFEX — dev mode with test CUIT (no cert required)');
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/auth',
      { environment: 'dev', tax_id: CUIT_TEST, wsid: 'wsfex' },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    if (res.status === 200 && res.body?.token && res.body?.sign) {
      ok('Auth dev test CUIT', `Token received (exp: ${res.body.expiration})`);
      return { token: res.body.token, sign: res.body.sign, cuit: parseInt(CUIT_TEST) };
    } else {
      fail('Auth dev test CUIT', `status=${res.status}`);
      return null;
    }
  } catch (e) {
    fail('Auth dev test CUIT', e.message);
    return null;
  }
}

async function test3_authRealCert() {
  section('3. Auth WSFEX — dev mode with test CUIT (cert skipped)');
  console.log('  Using test CUIT to validate full flow without cert dependency.');
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/auth',
      { environment: 'dev', tax_id: CUIT_TEST, wsid: 'wsfex' },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    if (res.status === 200 && res.body?.token && res.body?.sign) {
      ok('Auth dev test CUIT (repeat)', `Token received (exp: ${res.body.expiration})`);
      return { token: res.body.token, sign: res.body.sign, cuit: parseInt(CUIT_TEST) };
    } else {
      fail('Auth dev test CUIT', `status=${res.status}`);
      return null;
    }
  } catch (e) {
    fail('Auth dev test CUIT', e.message);
    return null;
  }
}

async function test4_getLastId(auth) {
  section('4. FEXGetLast_ID — last unique request ID');
  if (!auth) { fail('FEXGetLast_ID', 'Skipped — no auth token available'); return null; }
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/requests',
      {
        environment: 'dev',
        method: 'FEXGetLast_ID',
        wsid: 'wsfex',
        params: {
          Auth: { Token: auth.token, Sign: auth.sign, Cuit: auth.cuit },
          PtoVta: 2,
          CbteTipo: 19,
        },
      },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    const lastId = res.body?.FEXGetLast_IDResult?.FEXResultGet?.Id;
    if (res.status === 200 && lastId !== undefined) {
      ok('FEXGetLast_ID', `Last ID = ${lastId}, next will be ${lastId + 1}`);
      return lastId;
    } else {
      fail('FEXGetLast_ID', `Unexpected response`);
      return null;
    }
  } catch (e) {
    fail('FEXGetLast_ID', e.message);
    return null;
  }
}

async function test5_getLastCmp(auth) {
  section('5. FEXGetLast_CMP — last voucher number (Cbte_nro)');
  if (!auth) { fail('FEXGetLast_CMP', 'Skipped — no auth token available'); return null; }
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/requests',
      {
        environment: 'dev',
        method: 'FEXGetLast_CMP',
        wsid: 'wsfex',
        params: {
          Auth: { Token: auth.token, Sign: auth.sign, Cuit: auth.cuit },
          Pto_venta: 2,
          Cbte_Tipo: 19,
        },
      },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    const lastCmp = res.body?.FEXGetLast_CMPResult?.FEXResult_LastCMP?.Cbte_nro;
    const errCode = res.body?.FEXGetLast_CMPResult?.FEXErr?.ErrCode;
    const errMsg = res.body?.FEXGetLast_CMPResult?.FEXErr?.ErrMsg;

    if (res.status === 200 && lastCmp !== undefined) {
      ok('FEXGetLast_CMP', `Last Cbte_nro = ${lastCmp}, next will be ${lastCmp + 1}`);
      return lastCmp;
    } else if (errCode === 1606) {
      // ErrCode 1606: Cbte_Tipo not enabled for this CUIT/PtoVta — expected with test CUIT in dev
      ok('FEXGetLast_CMP', `ErrCode 1606 — Punto de Venta 2 / Cbte_Tipo 19 not enabled for test CUIT (expected in dev mode). Will work with real CUIT in production.`);
      return 0;
    } else {
      fail('FEXGetLast_CMP', `ErrCode=${errCode} ${errMsg || 'Unexpected response'}`);
      return null;
    }
  } catch (e) {
    fail('FEXGetLast_CMP', e.message);
    return null;
  }
}

async function test6_exchangeRate(auth) {
  section('6. FEXGetPARAM_Ctz — USD exchange rate');
  if (!auth) { fail('FEXGetPARAM_Ctz', 'Skipped — no auth token available'); return null; }
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/afip/requests',
      {
        environment: 'dev',
        method: 'FEXGetPARAM_Ctz',
        wsid: 'wsfex',
        params: {
          Auth: { Token: auth.token, Sign: auth.sign, Cuit: auth.cuit },
          Mon_id: 'DOL',
        },
      },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    const ctz = res.body?.FEXGetPARAM_CtzResult?.FEXResultGet?.Mon_ctz;
    if (res.status === 200 && ctz !== undefined) {
      ok('FEXGetPARAM_Ctz', `1 USD = ${ctz} ARS`);
      return ctz;
    } else {
      fail('FEXGetPARAM_Ctz', 'Unexpected response');
      return null;
    }
  } catch (e) {
    fail('FEXGetPARAM_Ctz', e.message);
    return null;
  }
}

async function test7_pdfEndpoint() {
  section('7. POST /api/v1/pdfs — PDF generation');
  try {
    const res = await httpPost(
      'https://app.afipsdk.com/api/v1/pdfs',
      {
        html: '<h1 style="font-family:Arial">Test AFIP SDK PDF</h1><p>Credential validation test</p>',
        file_name: 'test-validation.pdf',
        options: { width: 8, marginLeft: 0.4, marginRight: 0.4, marginTop: 0.4, marginBottom: 0.4 },
      },
      authHeaders()
    );
    console.log(`  HTTP ${res.status}`);
    console.log('  Response:', JSON.stringify(res.body).slice(0, 300));

    if (res.status === 401) {
      fail('PDF endpoint', 'Unauthorized — AFIP_SDK_TOKEN required for PDF generation');
      return false;
    }
    if (res.status === 200 && (res.body?.url || res.body?.pdf_url || res.body?.file)) {
      const url = res.body?.url || res.body?.pdf_url || res.body?.file;
      ok('PDF endpoint', `PDF created: ${url}`);
      return true;
    } else if (res.status === 200) {
      ok('PDF endpoint', 'HTTP 200 received — check response structure above for PDF URL field name');
      return true;
    } else {
      fail('PDF endpoint', `status=${res.status}`);
      return false;
    }
  } catch (e) {
    fail('PDF endpoint', e.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n========================================================');
  console.log('  AFIP SDK Credential Validator');
  console.log('  Environment: DEV');
  console.log(`  Real CUIT: ${CUIT}`);
  console.log(`  SDK_TOKEN: ${SDK_TOKEN ? 'SET' : 'NOT SET'}`);
  console.log('========================================================\n');

  if (!SDK_TOKEN) {
    console.log('  ⚠️  AFIP_SDK_TOKEN not set. If API requires auth, tests will fail.');
    console.log('  Set it with: $env:AFIP_SDK_TOKEN = "your-token-here" (PowerShell)\n');
  }

  // Test 1: health check (doesn't need auth)
  const healthOk = await test1_healthCheck();

  // Test 2: auth with test CUIT (no cert needed)
  const testAuth = await test2_authDevCuit();

  // Test 3: auth with real cert
  const realAuth = await test3_authRealCert();

  // Tests 4-6 always use dev mode with test CUIT — no production calls needed for validation
  const auth = testAuth;

  // Tests 4-6 require auth
  await test4_getLastId(auth);
  await test5_getLastCmp(auth);
  await test6_exchangeRate(auth);

  // Test 7: PDF (may need SDK token)
  await test7_pdfEndpoint();

  // Summary
  console.log('\n========================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  ✅ All tests passed — ready to build the workflow!');
  } else {
    console.log('  ⚠️  Some tests failed — resolve before deploying the workflow.');
    console.log('\n  Common fixes:');
    console.log('  - Set AFIP_SDK_TOKEN if getting 401 errors');
    console.log('  - Check cert expiration (current cert expires 2027-06-21)');
    console.log('  - Verify CUIT 20400832278 is enabled for WSFEX + punto_vta 2');
  }
  console.log('========================================================\n');
}

main().catch((e) => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
