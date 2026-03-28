/**
 * AFIP Certificate Creator
 *
 * Creates cert + key for WSFEX via afipsdk.com automation.
 * Saves the results to cert.pem and key.pem in this directory.
 *
 * Setup:
 *   npm install @afipsdk/afip.js
 *
 * Run:
 *   node create-cert.js
 *
 * Required env vars (set before running):
 *   AFIP_SDK_TOKEN   — your afipsdk.com access token
 *   AFIP_CUIT        — your real CUIT (ej: 20400832278)
 *   AFIP_USERNAME    — CUIT used to log in to ARCA (usually same as AFIP_CUIT)
 *   AFIP_PASSWORD    — your ARCA password
 *   AFIP_ALIAS       — alias for the certificate (alphanumeric, ej: mifacturacert)
 */

import 'dotenv/config';
import Afip from '@afipsdk/afip.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config — from env vars
// ---------------------------------------------------------------------------
const SDK_TOKEN   = process.env.AFIP_SDK_TOKEN;
const CUIT        = process.env.AFIP_CUIT;
const USERNAME    = process.env.AFIP_USERNAME || CUIT;
const PASSWORD    = process.env.AFIP_PASSWORD;
const ALIAS       = process.env.AFIP_ALIAS || 'mifacturacert';

// ---------------------------------------------------------------------------
// Validate required vars
// ---------------------------------------------------------------------------
const missing = [];
if (!SDK_TOKEN) missing.push('AFIP_SDK_TOKEN');
if (!CUIT)      missing.push('AFIP_CUIT');
if (!PASSWORD)  missing.push('AFIP_PASSWORD');

if (missing.length > 0) {
  console.error('\n❌ Faltan variables de entorno requeridas:');
  missing.forEach(v => console.error(`   $${v}`));
  console.error('\nEjemplo (PowerShell):');
  console.error('   $env:AFIP_SDK_TOKEN = "tu-token"');
  console.error('   $env:AFIP_CUIT      = "20400832278"');
  console.error('   $env:AFIP_PASSWORD  = "tu-password"');
  console.error('   $env:AFIP_ALIAS     = "mifacturacert"');
  console.error('   node create-cert.js\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n========================================================');
  console.log('  AFIP Certificate Creator');
  console.log(`  CUIT:     ${CUIT}`);
  console.log(`  Username: ${USERNAME}`);
  console.log(`  Alias:    ${ALIAS}`);
  console.log('========================================================\n');

  const afip = new Afip({ access_token: SDK_TOKEN });

  console.log('  Iniciando automation "create-cert-dev"...');
  console.log('  (Esto puede tardar 30-60 segundos)\n');

  const data = {
    cuit:     CUIT,
    username: USERNAME,
    password: PASSWORD,
    alias:    ALIAS,
  };

  const response = await afip.CreateAutomation('create-cert-dev', data, true);

  console.log('  Respuesta recibida:');
  console.log(JSON.stringify(response, null, 2));

  // Extract cert and key from response
  const cert = response?.cert || response?.certificate || response?.data?.cert;
  const key  = response?.key  || response?.private_key  || response?.data?.key;

  if (!cert || !key) {
    console.error('\n❌ No se encontraron cert/key en la respuesta.');
    console.error('   Revisa la respuesta completa arriba.');
    process.exit(1);
  }

  // Save to files
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath  = path.join(__dirname, 'key.pem');

  fs.writeFileSync(certPath, cert, 'utf8');
  fs.writeFileSync(keyPath,  key,  'utf8');

  console.log('\n✅ Certificados guardados:');
  console.log(`   cert.pem → ${certPath}`);
  console.log(`   key.pem  → ${keyPath}`);
  console.log('\nProximos pasos:');
  console.log('  1. Copia el contenido de cert.pem y key.pem');
  console.log('  2. En n8n, editá "issuer_config":');
  console.log('       WSID = "wsfex"');
  console.log(`       CERT = <contenido de cert.pem>`);
  console.log(`       KEY  = <contenido de key.pem>`);
  console.log(`       TAX_ID = "${CUIT}"`);
  console.log('========================================================\n');
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message || e);
  if (e.response) {
    console.error('   Status:', e.response.status);
    console.error('   Headers:', JSON.stringify(e.response.headers, null, 2));
    console.error('   Body:', JSON.stringify(e.response.data, null, 2));
  } else {
    console.error('   Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
  }
  process.exit(1);
});
