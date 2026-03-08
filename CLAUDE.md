# n8n Workflow Generator

## Propósito

Este proyecto permite la creación de agentes de IA y flujos de trabajo en n8n utilizando instrucciones basadas en prompts. Claude actúa como diseñador y generador de workflows complejos, listos para ejecutarse directamente en una instancia de n8n.

## Estado de Instalación

| Recurso | Estado | Ubicación |
|---------|--------|-----------|
| Skills n8n | ✅ Instalado | `~/.claude/skills/n8n-*` |
| MCP n8n | ✅ Configurado | `.mcp.json` |
| Instancia n8n | ✅ Conectada | `http://localhost:5678` |

## Recursos Disponibles

### 1. Skills de n8n (7 skills instalados)

| Skill | Propósito |
|-------|-----------|
| `n8n-expression-syntax` | Sintaxis de expresiones `{{}}`, acceso a `$json/$node`, errores comunes |
| `n8n-mcp-tools-expert` | Guía experta para usar herramientas MCP de n8n |
| `n8n-workflow-patterns` | Patrones arquitectónicos: webhook, HTTP API, database, AI, scheduled |
| `n8n-validation-expert` | Interpretar errores de validación y corregirlos |
| `n8n-node-configuration` | Configuración de nodos según operación |
| `n8n-code-javascript` | Código JavaScript en nodos Code |
| `n8n-code-python` | Código Python en nodos Code |

**Activación automática**: Los skills se activan según el contexto de la consulta.

### 2. MCP de n8n (Full Configuration)

Configuración completa en `.mcp.json` con acceso a todas las funcionalidades:

**Herramientas de Descubrimiento de Nodos:**

- `search_nodes` - Buscar nodos por keyword
- `get_node` - Info de nodo (niveles: minimal, standard, full)

**Herramientas de Validación:**

- `validate_node` - Validar configuración de nodo
- `validate_workflow` - Validar workflow completo
- `n8n_autofix_workflow` - Auto-corrección de errores

**Gestión de Workflows:**

- `n8n_create_workflow` - Crear workflows
- `n8n_update_partial_workflow` - Actualizaciones incrementales
- `n8n_validate_workflow` - Validar por ID
- `n8n_deploy_template` - Desplegar templates
- `n8n_workflow_versions` - Historial y rollback
- `n8n_test_workflow` - Ejecutar pruebas
- `n8n_executions` - Gestionar ejecuciones

**Templates:**

- `search_templates` - Buscar templates (keyword, by_nodes, by_task)
- `get_template` - Obtener detalles de template

**Documentación:**

- `tools_documentation` - Meta-documentación de herramientas
- `ai_agents_guide` - Guía para workflows de agentes IA

## Estructura de Workflows

### Convenciones de Nomenclatura

```
[CATEGORIA]-[NOMBRE]-[VERSION]
```

Categorías:

- `AGENT` - Agentes de IA autónomos
- `FLOW` - Flujos de automatización
- `UTIL` - Utilidades reutilizables
- `INT` - Integraciones con servicios externos
- `DATA` - Procesamiento de datos

### Estructura de Nodos

Todo workflow debe seguir esta estructura base:

```
1. TRIGGER → Define cómo se inicia el flujo
2. INPUT → Validación y normalización de datos de entrada
3. PROCESS → Lógica principal del flujo
4. OUTPUT → Formateo y entrega de resultados
5. ERROR → Manejo de errores y fallbacks
```

## Patrones de Diseño

### Patrón: Agente de IA

```json
{
  "trigger": "Webhook/Schedule/Manual",
  "nodes": [
    "AI Agent (OpenAI/Anthropic)",
    "ToolNodes (según necesidad)",
    "Memory (si conversacional)",
    "Output Handler"
  ]
}
```

### Patrón: Procesamiento de Datos

```json
{
  "trigger": "Webhook/Database Trigger",
  "nodes": [
    "Data Validation",
    "Transform/Map",
    "Conditional Logic",
    "Database/API Output"
  ]
}
```

### Patrón: Integración Multi-Servicio

```json
{
  "trigger": "Cualquier trigger",
  "nodes": [
    "Service A Input",
    "Data Mapping",
    "Service B Output",
    "Error Notification"
  ]
}
```

## Reglas de Generación

### CRÍTICAS (Bloquean cualquier acción)

> **⛔ REGLA ABSOLUTA: SIN MCP NO SE HACE NADA ⛔**
>
> El MCP de n8n es OBLIGATORIO para CUALQUIER operación en este proyecto.
> **ANTES de hacer CUALQUIER cosa** (crear workflows, modificar, validar, investigar nodos, CUALQUIER COSA),
> se DEBE ejecutar `n8n_list_workflows()` o `n8n_health_check()` para confirmar que el MCP responde correctamente.
>
> **SI EL MCP NO RESPONDE O DA ERROR DE AUTENTICACIÓN:**
>
> 1. **ABORTAR INMEDIATAMENTE** toda ejecución
> 2. **NO usar alternativas** (NO usar curl, NO usar Bash, NO usar nada que no sea MCP)
> 3. **INFORMAR AL USUARIO** que el MCP no está disponible
> 4. **NO PROCEDER** con ninguna tarea hasta que el MCP esté funcionando
> 5. **GUIAR AL USUARIO** para reconectar el MCP siguiendo este procedimiento:
>
> **PROCEDIMIENTO DE CONFIGURACIÓN DEL MCP (Primera vez o reconexión):**
>
> **⚠️ IMPORTANTE: Este comando SOLO funciona desde Git Bash, NO desde PowerShell.**
>
> **Comando único definitivo (ejecutar desde Git Bash. SOLICITAR APIKEY AL USUARIO ANTES DE EJECUTAR EL COMANDO):**
>
> ```bash
> cd /d/inside-projects/n8n-workflows && claude mcp add --scope local --transport stdio n8n-mcp --env MCP_MODE=stdio --env LOG_LEVEL=error --env DISABLE_CONSOLE_OUTPUT=true --env N8N_API_URL=http://localhost:5678 --env N8N_API_KEY=apikey -- npx -y n8n-mcp
> ```
>
> **Verificar instalación:**
>
> ```bash
> claude mcp list
> # Debe mostrar: n8n-mcp: npx -y n8n-mcp - ✓ Connected
>
> claude mcp get n8n-mcp
> # Debe mostrar todas las variables de entorno incluyendo N8N_API_KEY
> ```
>
> **Detalles técnicos del comando:**
>
> - `--scope local`: MCP solo para este proyecto (recomendado)
> - `--transport stdio`: Protocolo de comunicación estándar I/O
> - `--env VAR=valor`: Cada variable de entorno debe pasarse por separado
> - `-- npx -y n8n-mcp`: El `--` separa las opciones de Claude de las del comando MCP
> - `-y` en npx: Evita preguntas interactivas
>
> **Ubicación del archivo de configuración:**
>
> - El comando crea/modifica: `C:\Users\RodrigoCabrera\.claude.json`
> - Este archivo es local al proyecto y persiste entre reinicios
>
> **Por qué NO funciona en PowerShell:**
>
> - PowerShell interpreta los argumentos `--env` de forma diferente
> - Corta las líneas largas incorrectamente
> - Solo Git Bash (que viene con Claude Code) maneja correctamente la sintaxis
>
> **NO HAY EXCEPCIONES. NO HAY ALTERNATIVAS. SIN MCP = NO SE TRABAJA.**

> **ANTES DE CREAR CUALQUIER WORKFLOW, VERIFICAR:**

1. **Verificar MCP Disponible**: Ejecutar `n8n_list_workflows()` o `n8n_health_check()` para confirmar conexión
   - Si MCP no responde → **ABORTAR TODO**, informar al usuario y NO PROCEDER
   - Si MCP da error de autenticación → **ABORTAR TODO**, pedir al usuario que reinstale el MCP
   - El MCP es para ACCIÓN/EJECUCIÓN (crear, modificar, validar workflows)
   - **NUNCA usar Bash/curl como alternativa al MCP**

2. **Verificar Skills Disponibles (OBLIGATORIO)**:
   - Los skills de n8n son la **FUENTE PRINCIPAL Y OBLIGATORIA** de conocimiento sobre n8n
   - **ANTE CUALQUIER duda, petición o tarea del usuario**, se DEBE consultar el skill correspondiente PRIMERO
   - **SIEMPRE usar skills explícitamente** para obtener información sobre: nodos, expresiones, patrones, configuración, código, validación
   - Si los skills no están disponibles → **ABORTAR TODO**, informar al usuario y NO PROCEDER
   - **NO responder sobre n8n basándose en conocimiento propio** → SIEMPRE consultar el skill primero
   - Los skills son para DOCUMENTACIÓN (cómo funcionan los nodos, sintaxis, patrones)
   - **Skills disponibles y cuándo usarlos**:

     | Skill | Usar cuando... |
     |-------|---------------|
     | `n8n-expression-syntax` | Se escriban expresiones `{{}}`, se acceda a `$json/$node` |
     | `n8n-mcp-tools-expert` | Se usen herramientas MCP de n8n |
     | `n8n-workflow-patterns` | Se diseñe la arquitectura de un workflow |
     | `n8n-validation-expert` | Se interpreten errores de validación |
     | `n8n-node-configuration` | Se configure CUALQUIER nodo |
     | `n8n-code-javascript` | Se escriba JavaScript en Code nodes |
     | `n8n-code-python` | Se escriba Python en Code nodes |

3. **NUNCA INVENTAR O SUPONER**:
   - NO usar funciones que no existen (ej: `fetch()` no existe en n8n Code nodes)
   - NO adivinar configuraciones de nodos → CONSULTAR skill o `get_node()` PRIMERO
   - NO crear workflows sin validar cada nodo con la documentación
   - Si no se sabe algo → BUSCAR EN SKILLS/MCP, no inventar

4. **Flujo obligatorio de trabajo**:

   ```
   1. Verificar MCP funciona (health_check o list_workflows)
   2. Consultar SKILL para entender el patrón/arquitectura
   3. Consultar get_node() para cada tipo de nodo a usar
   4. Crear workflow con n8n_create_workflow
   5. Validar con n8n_validate_workflow
   6. Corregir errores iterativamente
   ```

5. **Separación de responsabilidades**:

   | Herramienta | Propósito | Ejemplo |
   |-------------|-----------|---------|
   | **SKILL** | Documentación, patrones, sintaxis | "¿Cómo hacer HTTP requests?" → Leer skill |
   | **MCP** | Acción, ejecución, CRUD | Crear/modificar/validar workflows |

### Obligatorias

1. **Manejo de Errores**: Todo workflow DEBE incluir nodos de error handling
2. **Documentación**: Cada nodo debe tener descripción clara en `notes`
3. **Credenciales**: Usar referencias a credenciales, nunca valores hardcodeados
4. **Idempotencia**: Los flujos deben ser seguros de re-ejecutar
5. **Logging**: Incluir puntos de logging para debugging
6. **HTTP en n8n**: SIEMPRE usar nodos HTTP Request, NUNCA `fetch()` en Code nodes
7. **Code Nodes**: Solo para transformación de datos, NO para llamadas HTTP

### Recomendadas

1. **Modularidad**: Dividir lógica compleja en sub-workflows
2. **Timeouts**: Configurar timeouts apropiados en llamadas HTTP
3. **Rate Limiting**: Considerar límites de APIs externas
4. **Retry Logic**: Implementar reintentos para operaciones críticas

## Formato de Salida

Los workflows se generan en formato JSON compatible con n8n:

```json
{
  "name": "CATEGORIA-nombre-v1",
  "nodes": [],
  "connections": {},
  "settings": {
    "errorWorkflow": "error-handler",
    "saveExecutionProgress": true
  },
  "staticData": null,
  "tags": []
}
```

## Comandos de Interacción

### Crear Workflow

```
Crea un workflow que [descripción del objetivo]
```

### Modificar Workflow

```
Modifica el workflow [nombre] para [cambios requeridos]
```

### Explicar Workflow

```
Explica el workflow [nombre] o [pegar JSON]
```

### Optimizar Workflow

```
Optimiza el workflow [nombre] para [objetivo: rendimiento/legibilidad/etc]
```

## Nodos Comunes

### Triggers

- `n8n-nodes-base.webhook` - HTTP webhook
- `n8n-nodes-base.scheduleTrigger` - Programación temporal
- `n8n-nodes-base.manualTrigger` - Ejecución manual
- `n8n-nodes-base.emailTrigger` - Trigger por email

### AI/LLM

- `@n8n/n8n-nodes-langchain.agent` - Agente LangChain
- `@n8n/n8n-nodes-langchain.chainLlm` - Cadena LLM
- `@n8n/n8n-nodes-langchain.openAi` - OpenAI directo
- `@n8n/n8n-nodes-langchain.anthropic` - Anthropic/Claude

### Lógica

- `n8n-nodes-base.if` - Condicional
- `n8n-nodes-base.switch` - Switch múltiple
- `n8n-nodes-base.merge` - Combinar datos
- `n8n-nodes-base.splitInBatches` - Procesamiento por lotes

### Datos

- `n8n-nodes-base.set` - Establecer valores
- `n8n-nodes-base.code` - JavaScript/Python personalizado
- `n8n-nodes-base.httpRequest` - Llamadas HTTP
- `n8n-nodes-base.postgres` / `mysql` / `mongodb` - Bases de datos

## Mejores Prácticas

### Rendimiento

- Usar `splitInBatches` para grandes volúmenes
- Implementar caching cuando sea posible
- Minimizar llamadas a APIs externas

### Seguridad

- Nunca exponer credenciales en logs
- Validar inputs en webhooks públicos
- Usar autenticación en webhooks cuando sea posible

### Mantenibilidad

- Nombres descriptivos en nodos
- Agrupar nodos relacionados con sticky notes
- Versionar cambios significativos

## Integración con MCP

El MCP de n8n permite:

```typescript
// Operaciones disponibles via MCP
- workflow.create(json)      // Crear workflow
- workflow.update(id, json)  // Actualizar workflow
- workflow.delete(id)        // Eliminar workflow
- workflow.execute(id)       // Ejecutar workflow
- workflow.get(id)           // Obtener workflow
- workflow.list()            // Listar workflows
- credentials.list()         // Listar credenciales
- executions.list()          // Listar ejecuciones
```

## Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-02-16 | 1.3.0 | Comando definitivo para configurar MCP desde Git Bash (Windows compatible) |
| 2025-02-15 | 1.2.0 | Reglas CRÍTICAS: verificar MCP/Skills antes de actuar, nunca inventar |
| 2025-02-14 | 1.1.0 | Skills n8n instalados, MCP configurado con Full Configuration |
| 2025-02-14 | 1.0.0 | Versión inicial del documento |

---

## Archivos del Proyecto

```
n8n-workflows/
├── CLAUDE.md              # Este documento (governance central)
├── .mcp.json              # Configuración MCP de n8n
└── n8n-skills/            # Repositorio de skills (referencia)
    ├── skills/            # Código fuente de skills
    ├── docs/              # Documentación adicional
    └── evaluations/       # Tests y evaluaciones
```

## Errores Comunes a Evitar

### Errores que NO se deben cometer

| Error | Por qué está mal | Solución correcta |
|-------|------------------|-------------------|
| Usar `fetch()` en Code node | No existe en n8n | Usar nodo HTTP Request o `$helpers.httpRequest()` |
| Crear workflow sin verificar MCP | Puede fallar silenciosamente | Ejecutar `n8n_health_check()` primero |
| Adivinar configuración de nodos | Configuración incorrecta | Consultar `get_node({nodeType: "..."})` |
| Ignorar validación | Errores en producción | Siempre ejecutar `n8n_validate_workflow()` |
| Hardcodear credenciales | Seguridad comprometida | Usar sistema de credenciales de n8n |
| No leer skills antes de actuar | Reinventar la rueda mal | SKILL = documentación, leer PRIMERO |

### Lecciones Aprendidas

1. **SKILL vs MCP**: Son complementarios, no intercambiables
   - SKILL te dice CÓMO hacer algo (documentación)
   - MCP te permite HACERLO (ejecución)

2. **Verificar antes de actuar**: Siempre confirmar que las herramientas están disponibles

3. **Iterar con validación**: Crear → Validar → Corregir → Validar (ciclo continuo)

4. **No suponer**: Si no está en la documentación, preguntar o buscar

5. **Organización de archivos**:
   - `CLAUDE.md` (raíz) → SOLO información general sobre cómo crear flujos en n8n (reglas, patrones, nodos, convenciones)
   - `.claude/CLAUDE.md` → Breve descripción del flujo/proyecto específico + referencia al plan detallado
   - `.claude/plans/*.md` → Plan detallado de cada flujo/proyecto
   - **NUNCA poner planes de flujos específicos en el CLAUDE.md de la raíz**

6. **Configuración MCP en Windows**:
   - El archivo `.mcp.json` en la raíz del proyecto NO se lee automáticamente por Claude Code
   - Se requiere ejecutar `claude mcp add` desde Git Bash (NO PowerShell)
   - PowerShell no puede manejar múltiples `--env` correctamente
   - El comando completo debe incluir `--transport stdio` y todas las variables de entorno
   - La configuración se guarda en `~/.claude.json` (local al proyecto con `--scope local`)
   - Una vez configurado, persiste entre reinicios de Claude Code

---

## Notas de Desarrollo

Este documento es el punto central de referencia para la generación de workflows. Debe mantenerse actualizado conforme se agreguen nuevas capacidades, patrones o convenciones al proyecto.

### Fuentes de Skills

- Repositorio: <https://github.com/czlonkowski/n8n-skills>
- MCP Server: <https://github.com/czlonkowski/n8n-mcp>
- Créditos: Conceived by Romuald Członkowski - <www.aiadvisors.pl/en>
