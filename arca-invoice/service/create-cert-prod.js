/**
 * AFIP Production Certificate Creator
 *
 * Creates cert + key for WSFEX in the PRODUCTION environment via afipsdk.com.
 * Saves results to cert-prod.pem and key-prod.pem in the parent directory.
 *
 * Run AFTER obtaining production access from AFIP:
 *   1. Log in to https://auth.afip.gob.ar
 *   2. Go to: Administrador de Relaciones de Clave Fiscal → Adherir Servicio
 *   3. Enable "Factura Electrónica" → "wsfex" for production
 *
 * Setup:
 *   npm install @afipsdk/afip.js
 *
 * Run (PowerShell):
 *   $env:AFIP_SDK_TOKEN = "tu-token"
 *   $env:AFIP_CUIT      = "20400832278"
 *   $env:AFIP_PASSWORD  = "tu-password-arca"
 *   $env:AFIP_ALIAS     = "facturaprod"
 *   node create-cert-prod.js
 *
 * After running:
 *   1. Copy cert-prod.pem and key-prod.pem contents
 *   2. In n8n, edit "issuer_config": replace CERT and KEY with the new values
 *   3. Run auth-webservice-prod.js to authorize wsfex in production
 */

import 'dotenv/config';
import Afip from '@afipsdk/afip.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config from env vars
// ---------------------------------------------------------------------------
const SDK_TOKEN = process.env.AFIP_SDK_TOKEN;
const CUIT      = process.env.AFIP_CUIT;
const USERNAME  = process.env.AFIP_USERNAME || CUIT;
const PASSWORD  = process.env.AFIP_PASSWORD;
const ALIAS     = process.env.AFIP_ALIAS || 'facturaprod';

// ---------------------------------------------------------------------------
// Validate required vars
// ---------------------------------------------------------------------------
const missing = [];
if (!SDK_TOKEN) missing.push('AFIP_SDK_TOKEN');
if (!CUIT)      missing.push('AFIP_CUIT');
if (!PASSWORD)  missing.push('AFIP_PASSWORD');

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach(v => console.error(`   $${v}`));
  console.error('\nExample (PowerShell):');
  console.error('   $env:AFIP_SDK_TOKEN = "tu-token"');
  console.error('   $env:AFIP_CUIT      = "20400832278"');
  console.error('   $env:AFIP_PASSWORD  = "tu-password-arca"');
  console.error('   $env:AFIP_ALIAS     = "facturaprod"');
  console.error('   node create-cert-prod.js\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n========================================================');
  console.log('  AFIP Certificate Creator — PRODUCTION');
  console.log(`  CUIT:     ${CUIT}`);
  console.log(`  Username: ${USERNAME}`);
  console.log(`  Alias:    ${ALIAS}`);
  console.log('  Environment: PRODUCTION');
  console.log('========================================================\n');

  const afip = new Afip({ access_token: SDK_TOKEN });

  console.log('  Starting automation "create-cert-prod"...');
  console.log('  (This may take 30-60 seconds)\n');

  const response = await afip.CreateAutomation('create-cert-prod', {
    cuit:     CUIT,
    username: USERNAME,
    password: PASSWORD,
    alias:    ALIAS,
  }, true);

  console.log('  Response received:');
  console.log(JSON.stringify(response, null, 2));

  const cert = response?.cert || response?.certificate || response?.data?.cert;
  const key  = response?.key  || response?.private_key  || response?.data?.key;

  if (!cert || !key) {
    console.error('\n❌ cert/key not found in response.');
    console.error('   Check the full response above.');
    process.exit(1);
  }

  // Save to parent directory (alongside dev certs for comparison)
  const certPath = path.join(__dirname, '..', 'cert-prod.pem');
  const keyPath  = path.join(__dirname, '..', 'key-prod.pem');

  fs.writeFileSync(certPath, cert, 'utf8');
  fs.writeFileSync(keyPath,  key,  'utf8');

  console.log('\n✅ Production certificates saved:');
  console.log(`   cert-prod.pem → ${certPath}`);
  console.log(`   key-prod.pem  → ${keyPath}`);
  console.log('\nNext steps:');
  console.log('  1. Run auth-webservice-prod.js to authorize wsfex in production');
  console.log('  2. Copy cert-prod.pem and key-prod.pem contents');
  console.log('  3. In n8n, edit "issuer_config":');
  console.log('       ENVIRONMENT = "production"');
  console.log(`       CERT = <content of cert-prod.pem>`);
  console.log(`       KEY  = <content of key-prod.pem>`);
  console.log('========================================================\n');
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message || e);
  if (e.response) {
    console.error('   Status:', e.response.status);
    console.error('   Body:', JSON.stringify(e.response.data, null, 2));
  } else {
    console.error('   Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
  }
  process.exit(1);
});
