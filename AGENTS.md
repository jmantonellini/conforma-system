## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, drizzle, mcp, tailwindcss

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Estructura

- `src/lib/modulos/<modulo>/`: un módulo de negocio (contactos, cotizaciones, pedidos, fabricacion, productos, insumos, stock, tareas, configuracion, auth, adjuntos, ventas, inicio, notificaciones, reportes). Contiene sus `*.remote.ts`, esquemas valibot (`*.schema.ts`), lógica de servidor (`*.server.ts`), tipos (`tipos.ts`) y `componentes/`.
- `src/lib/ui/`: sistema de diseño compartido (componentes, iconos, toasts, confirmaciones). No importa módulos de negocio.
- `src/lib/server/`: plataforma (`db` con el esquema dividido por módulo en `db/schema/`, `auth`, `monitoreo`, `almacenamiento`, `integraciones`, `empresa`, `estados`).
- `src/lib/utils/`: utilidades puras compartidas.
- Multiempresa: toda tabla de negocio tiene `empresa_id` con default `empresa_actual()` y política RLS `aislamiento_empresa`. Las tablas nuevas usan `empresa()` y `aislamiento()` de `db/schema/base.ts`; los únicos de negocio se definen como `(empresa_id, campo)`.
- Importes en `numeric` (`importe`, `precioUnitario`, `porcentaje`, `cantidad` de `base.ts`) y fechas `timestamptz` (`fecha`).
- Migraciones: `0000_base` reemplaza el historial anterior (su `when` coincide con la última migración ya aplicada en producción, por eso producción la saltea). Las siguientes se generan con `pnpm db:generate`.
- Sin comentarios en el código.

## daisyUI

UI is built with **daisyUI 5** on **Tailwind CSS 4** (CSS-first config in `src/routes/layout.css`, no `tailwind.config.js`). Themes: `light` (default) and `dark` (prefers-dark).

- Use the `daisyui` skill (Claude Code) or `.github/instructions/daisyui.instructions.md` (Copilot) before writing markup. Reference: https://daisyui.com/llms.txt
- Prefer daisyUI component classes (`btn`, `card`, `modal`, `table`, `input`, `select`, `fieldset`…) and semantic colors (`primary`, `base-100`, `base-content`, `error`…) over raw Tailwind colors, so both themes work.
- Only fall back to Tailwind utilities for layout/spacing or when no daisyUI component fits.

## Svelte tooling for agents

- MCP server: `.mcp.json` (Claude Code) and `.vscode/mcp.json` (VS Code) point to `https://mcp.svelte.dev/mcp`.
- Skills: `svelte-core-bestpractices`, `svelte-code-writer` (in `.github/skills`, symlinked into `.claude/skills`).
- Subagent: `svelte-file-editor` (in `.github/agents`, symlinked into `.claude/agents`) — use it for creating/editing `.svelte`, `.svelte.ts`, `.svelte.js` files.
