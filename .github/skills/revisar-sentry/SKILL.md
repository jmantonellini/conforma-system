---
name: revisar-sentry
description: Revisa los issues sin resolver de Sentry de conforma-system, los agrupa por causa, corrige la causa raíz y deja el commit listo para que Sentry los resuelva solo en el próximo deploy. Usar cuando el usuario diga "revisá Sentry", pegue links de sentry.io o pregunte por errores de producción.
---

# Revisar Sentry

Organización: `juanma-antonellini`. Entorno: `produccion`.

## 1. Traer los issues

Usar las herramientas del MCP `sentry` (configurado en `.mcp.json`). Si no aparecen, pedirle al usuario que reinicie la sesión y complete el login OAuth de Sentry.

- Si el usuario pegó links, leer esos issues.
- Si no, listar los issues `is:unresolved` del entorno `produccion`, ordenados por cantidad de usuarios afectados.
- De cada issue leer: mensaje, stack trace con el primer frame propio (`src/`), tags `remota`, `postgres`, `tabla`, `restriccion`, usuario y release.

## 2. Agrupar

Juntar los issues que comparten causa: mismo frame propio, misma remota con el mismo código de Postgres, o el mismo mensaje con distintos valores. Si Sentry no los agrupó solo, anotar por qué (falta de sourcemaps, mensaje variable) para proponer una regla de agrupación.

Ignorar sin tocar código, y marcarlos `ignored` en Sentry con el motivo:

- Errores de extensiones del navegador o de redes caídas.
- Errores de releases viejos que no se repiten en el último release.

## 3. Corregir

- Seguir `AGENTS.md`: código en español, sin comentarios, daisyUI, errores de usuario con `error(4xx)`.
- Corregir la causa raíz, no silenciar el error. Si el problema es un dato inválido del usuario, validarlo en el esquema valibot para que vuelva como 4xx y deje de llegar a Sentry.
- Correr `pnpm check` y `pnpm lint` sin errores nuevos.

## 4. Cerrar

- No commitear ni pushear sin que el usuario lo pida: el push a `main` despliega a producción.
- Al commitear, terminar el mensaje con una línea `Fixes <SHORT-ID>` por cada issue arreglado (por ejemplo `Fixes CONFORMA-SYSTEM-1A`). Con la integración de GitHub en Sentry, el issue queda resuelto en el release de ese commit y, si vuelve a aparecer, Sentry lo marca como regresión.
- Resumir al usuario una tabla: issue, causa, arreglo o motivo para no arreglarlo.
