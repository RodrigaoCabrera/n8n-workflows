/**
 * AFIP Web Service Authorizer — PRODUCTION
 *
 * Authorizes a production certificate to use wsfex.
 * Must be run AFTER create-cert-prod.js completes successfully.
 *
 * Run (PowerShell):
 *   $env:AFIP_SDK_TOKEN = "tu-token"
 *   $env:AFIP_CUIT      = "20400832278"
 *   $env:AFIP_PASSWORD  = "tu-password-arca"
 *   $env:AFIP_ALIAS     = "wfsxinvoceprod"
 *   node auth-webservice-prod.js
 */

import 'dotenv/config';
import Afip from '@afipsdk/afip.js';

const SDK_TOKEN = process.env.AFIP_SDK_TOKEN;
const CUIT = process.env.AFIP_CUIT;
const USERNAME = process.env.AFIP_USERNAME || CUIT;
const PASSWORD = process.env.AFIP_PASSWORD;
const ALIAS = process.env.AFIP_ALIAS || 'wfsxinvoceprod';
const SERVICE = process.env.AFIP_SERVICE || 'wsfex';

const missing = [];
if (!SDK_TOKEN) missing.push('AFIP_SDK_TOKEN');
if (!CUIT) missing.push('AFIP_CUIT');
if (!PASSWORD) missing.push('AFIP_PASSWORD');

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

async function main() {
  console.log('\n========================================================');
  console.log('  AFIP Web Service Authorizer — PRODUCTION');
  console.log(`  CUIT:     ${CUIT}`);
  console.log(`  Alias:    ${ALIAS}`);
  console.log(`  Service:  ${SERVICE}`);
  console.log('  Environment: PRODUCTION');
  console.log('========================================================\n');

  const afip = new Afip({ access_token: SDK_TOKEN });

  console.log(`  Authorizing "${SERVICE}" for alias "${ALIAS}" in PRODUCTION...`);
  console.log('  (This may take 30-60 seconds)\n');

  const response = await afip.CreateAutomation('auth-web-service-prod', {
    cuit: CUIT,
    username: USERNAME,
    password: PASSWORD,
    alias: ALIAS,
    service: SERVICE,
  }, true);

  console.log('  Response:', JSON.stringify(response, null, 2));

  if (response?.status === 'complete' && response?.data?.status === 'created') {
    console.log(`\n✅ Web service "${SERVICE}" authorized in PRODUCTION.`);
    console.log('\nNext steps:');
    console.log('  1. Copy cert-prod.pem and key-prod.pem contents');
    console.log('  2. In n8n, edit "issuer_config":');
    console.log('       ENVIRONMENT = "production"');
    console.log(`       CERT = <content of cert-prod.pem>`);
    console.log(`       KEY  = <content of key-prod.pem>`);
    console.log('  3. Test with a real invoice before going live');
  } else {
    console.log('\n⚠️  Unexpected response — check the JSON above.');
    console.log('  The automation may have a different name for production.');
    console.log('  Check afipsdk.com documentation for the correct automation name.');
  }

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
