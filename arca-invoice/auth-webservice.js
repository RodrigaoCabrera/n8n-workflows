/**
 * AFIP Web Service Authorizer
 *
 * Authorizes a certificate to use a specific AFIP web service (wsfe or wsfex).
 * Must be run AFTER create-cert.js.
 *
 * Run:
 *   node auth-webservice.js
 *
 * Uses the same .env as create-cert.js.
 * Set AFIP_SERVICE in .env to wsfe or wsfex.
 */

import 'dotenv/config';
import Afip from '@afipsdk/afip.js';

const SDK_TOKEN = process.env.AFIP_SDK_TOKEN;
const CUIT      = process.env.AFIP_CUIT;
const USERNAME  = process.env.AFIP_USERNAME || CUIT;
const PASSWORD  = process.env.AFIP_PASSWORD;
const ALIAS     = process.env.AFIP_ALIAS || 'mifacturacert';
const SERVICE   = process.env.AFIP_SERVICE || 'wsfex';

const missing = [];
if (!SDK_TOKEN) missing.push('AFIP_SDK_TOKEN');
if (!CUIT)      missing.push('AFIP_CUIT');
if (!PASSWORD)  missing.push('AFIP_PASSWORD');

if (missing.length > 0) {
  console.error('\n❌ Faltan variables de entorno:', missing.join(', '));
  process.exit(1);
}

async function main() {
  console.log('\n========================================================');
  console.log('  AFIP Web Service Authorizer');
  console.log(`  CUIT:     ${CUIT}`);
  console.log(`  Alias:    ${ALIAS}`);
  console.log(`  Service:  ${SERVICE}`);
  console.log('========================================================\n');

  const afip = new Afip({ access_token: SDK_TOKEN });

  console.log(`  Autorizando "${SERVICE}" para alias "${ALIAS}"...`);
  console.log('  (Puede tardar 30-60 segundos)\n');

  const response = await afip.CreateAutomation('auth-web-service-dev', {
    cuit:     CUIT,
    username: USERNAME,
    password: PASSWORD,
    alias:    ALIAS,
    service:  SERVICE,
  }, true);

  console.log('  Respuesta:', JSON.stringify(response, null, 2));

  if (response?.status === 'complete' && response?.data?.status === 'created') {
    console.log(`\n✅ Web service "${SERVICE}" autorizado correctamente.`);
    console.log('\nProximos pasos:');
    console.log('  1. En n8n, editá "issuer_config":');
    console.log('       WSID        = "wsfex"');
    console.log('       ENVIRONMENT = "dev"');
    console.log(`       TAX_ID      = "${CUIT}"`);
    console.log('       CERT        = <contenido de cert.pem>');
    console.log('       KEY         = <contenido de key.pem>');
  } else {
    console.log('\n⚠️  Respuesta inesperada — revisá el JSON arriba.');
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
