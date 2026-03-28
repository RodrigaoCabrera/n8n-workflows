# Workflow: Factura - Arca (WSFEX)

## Overview

n8n workflow que genera facturas electrónicas de exportación (Factura E) via AFIP SDK.
Autoriza comprobantes ante ARCA/AFIP y devuelve un CAE + PDF.

- **ID n8n**: `52jg5Zl4ffolQ1Fq`
- **Nombre**: `Factura - Arca`
- **Estado**: Activo y funcional
- **Trigger**: Form (manual) o API
- **Servicio AFIP**: WSFEX (Web Service Facturación Electrónica de Exportación)
- **SDK**: [afipsdk.com](https://afipsdk.com) — `https://app.afipsdk.com/api/v1`

---

## Arquitectura (15 nodos)

```
Formulario Factura
        │
  issuer_config        ← UNICA fuente de configuracion
        │
 get_authorization     ← POST /afip/auth → obtiene Token + Sign
        │
  get_last_cbte        ← Code: construye body para FEXGetLast_CMP
        │
get_last_cbte_http     ← POST /afip/requests → ultimo cbte_nro autorizado
        │
   get_last_id         ← POST /afip/requests → FEXGetLast_ID → proximo Id
        │
get_exchange_rate      ← POST /afip/requests → FEXGetPARAM_Ctz → cotizacion DOL
        │
  build_voucher        ← Code: construye el payload FEXAuthorize
        │
 create_voucher        ← POST /afip/requests → FEXAuthorize → CAE
        │
  check_result         ← Code: extrae CAE, cbte_nro, fechas
        │
   voucher_ok          ← IF: Resultado === "A"
       ├─ TRUE ─→ generate_html → create_pdf → success_output
       └─ FALSE ─→ error_output
```

---

## Configuracion (issuer_config)

El nodo `issuer_config` es la **unica fuente de verdad**. Solo hay que tocar este nodo para cambiar el modo de operacion.

```javascript
const WSID        = 'wsfex';          // siempre wsfex (facturas de exportacion)
const ENVIRONMENT = 'dev';            // 'dev' = homologacion | 'production' = real
const TAX_ID      = '20400832278';    // CUIT del emisor
const PUNTO_VTA   = 1;
const CERT        = '-----BEGIN CERTIFICATE-----\n...';
const KEY         = '-----BEGIN RSA PRIVATE KEY-----\n...';
```

| Variable | Dev (homologacion) | Production |
|----------|--------------------|------------|
| `ENVIRONMENT` | `'dev'` | `'production'` |
| `TAX_ID` | CUIT real o de prueba | CUIT real |
| `CERT` / `KEY` | certificado dev | certificado produccion |

---

## Flujo de datos WSFEX

### 1. Autorizacion (`get_authorization`)

```
POST /afip/auth
Body: { environment, wsid: "wsfex", tax_id, cert, key }
Response: { token, sign }
```

### 2. Ultimo comprobante (`get_last_cbte` + `get_last_cbte_http`)

```
POST /afip/requests
Body: {
  method: "FEXGetLast_CMP",
  wsid: "wsfex",
  params: {
    Auth: { Token, Sign, Cuit, Pto_venta, Cbte_Tipo }
    // CRITICO: Pto_venta y Cbte_Tipo van DENTRO de Auth (WSFEX-specific)
  }
}
Response: FEXGetLast_CMPResult.FEXResult_LastCMP.Cbte_nro
```

### 3. Ultimo ID (`get_last_id`)

```
POST /afip/requests
Body: { method: "FEXGetLast_ID", wsid: "wsfex", params: { Auth } }
Response: FEXGetLast_IDResult.FEXResultGet.Id
```

### 4. Cotizacion (`get_exchange_rate`)

```
POST /afip/requests
Body: {
  method: "FEXGetPARAM_Ctz",
  wsid: "wsfex",
  params: {
    Auth: { Token, Sign, Cuit },
    Mon_id: "DOL",
    FchCotiz: "YYYY-MM-DD"   // fecha de AYER (dia habil anterior)
  }
}
Response: FEXGetPARAM_CtzResult.FEXResultGet.Mon_ctz
```

> **Importante**: `FchCotiz` requiere formato `YYYY-MM-DD` (con guiones).
> AFIP valida la cotizacion contra el dia habil anterior, no el dia actual.

### 5. Autorizacion del comprobante (`build_voucher` + `create_voucher`)

```
POST /afip/requests
Body: {
  method: "FEXAuthorize",
  wsid: "wsfex",
  params: {
    Auth: { Token, Sign, Cuit },
    Cmp: {
      Id, Cbte_Tipo: 19, Fecha_cbte (YYYYMMDD), Punto_vta, Cbte_nro,
      Tipo_expo: 2,         // servicios
      Permiso_existente: '' // vacio para Tipo_expo 2 o 4
      Dst_cmp, Cliente, Cuit_pais_cliente, Domicilio_cliente, Id_impositivo,
      Moneda_Id: "DOL", Moneda_ctz,
      Imp_total, Idioma_cbte: 1, Forma_pago,
      Obs_comerciales, Obs, Fecha_pago,
      Items: { Item: [{ Pro_codigo, Pro_ds, Pro_qty, Pro_umed,
                        Pro_precio_uni, Pro_bonificacion, Pro_total_item }] }
      // NO incluir Cmps_asoc si no hay comprobantes asociados
    }
  }
}
Response: FEXResultAuth.Resultado === "A" → CAE valido
```

---

## Campos del formulario

| Campo | Tipo | Uso |
|-------|------|-----|
| `client_name` | texto | Nombre del cliente |
| `description` | texto | Descripcion del servicio (Obs_comerciales + Pro_ds) |
| `amount` | numero | Importe total en USD |
| `quantity` | numero | Cantidad (default: 1) |
| `client_country` | texto | Pais destino (ej: "ESTADOS UNIDOS") |
| `client_address` | texto | Domicilio del cliente |
| `client_tax_id` | texto | ID impositivo del cliente |
| `payment_method` | texto | Forma de pago (default: "Transferencia bancaria") |

### Paises soportados

| Pais | Dst_cmp | Cuit_pais_cliente |
|------|---------|-------------------|
| ESTADOS UNIDOS | 212 | 50000000016 |
| URUGUAY | 225 | 50000000858 |
| BRASIL | 109 | 50000000076 |
| CHILE | 113 | 50000000152 |
| COLOMBIA | 117 | 50000000232 |
| MEXICO | 167 | 50000000484 |
| ESPANA | 123 | 50000000131 |
| CANADA | 111 | 50000000101 |
| ALEMANIA | 102 | 50000000104 |
| REINO UNIDO | 200 | 50000000826 |

---

## Scripts de setup (`service/`)

| Script | Proposito | Comando |
|--------|-----------|---------|
| `create-cert.js` | Genera cert.pem + key.pem via afipsdk automation | `node service/create-cert.js` |
| `auth-webservice.js` | Autoriza el certificado para usar WSFEX | `node service/auth-webservice.js` |
| `test-credentials.js` | Verifica que el token + cert funcionan | `node service/test-credentials.js` |

Requieren `.env` con:
```
AFIP_SDK_TOKEN=
AFIP_CUIT=
AFIP_USERNAME=
AFIP_PASSWORD=
AFIP_ALIAS=
AFIP_SERVICE=wsfex
```

---

## Bugs criticos resueltos

| Error AFIP | Causa | Fix |
|------------|-------|-----|
| `Campo Cbte_Tipo no se corresponde` (1606) | `Pto_venta` y `Cbte_Tipo` fuera del Auth en FEXGetLast_CMP | Moverlos DENTRO de `Auth` (WSFEX-specific, diferente a WSFE) |
| `El numero de comprobante no coincide` | Derivado del error anterior — `lastCmp` siempre 0 | Idem |
| `Cotizacion informada no valida` | `FchCotiz` enviado sin guiones (`20260324` en lugar de `2026-03-24`) | Quitar `.replace(/-/g,'')` |
| `Si envia Cmps_asoc, Cmp_asoc es obligatorio` | Array vacio `[]` se serializa a SOAP sin elemento hijo | Omitir `Cmps_asoc` completamente cuando no hay comprobantes asociados |
| `Permiso_existente debe ser vacio para Tipo_expo=2` | Enviado como `'N'` en lugar de `''` | Usar `''` para Tipo_expo 2 o 4 |

---

## Estructura del proyecto

```
arca-invoice/
├── .env                    # credenciales (gitignored)
├── .env.example            # template de variables
├── .gitignore
├── cert.pem                # certificado AFIP (gitignored)
├── key.pem                 # clave privada (gitignored)
├── package.json
├── package-lock.json
├── workflow-refactored.json  # backup del workflow
├── docs/
│   └── workflow.md         # esta documentacion
└── service/
    ├── create-cert.js      # genera certificados
    ├── auth-webservice.js  # autoriza servicio web
    └── test-credentials.js # verifica credenciales
```
