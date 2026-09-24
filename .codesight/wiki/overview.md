# Wisdom-Studio — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**Wisdom-Studio** is a javascript project built with express, organized as a monorepo.

**Workspaces:** `wisdom-studio-backend` (`backend`), `wisdom-studio-frontend` (`frontend`), `wisdom-studio-mcp-server` (`mcp-server`)

## Scale

14 API routes · 15 UI components · 15 library files · 2 middleware layers · 4 environment variables

## Subsystems

- **[Health](./health.md)** — 1 routes
- **[ImageGen](./imagegen.md)** — 6 routes
- **[Projects](./projects.md)** — 6 routes — touches: db
- **[TextImport](./textimport.md)** — 1 routes

**UI:** 15 components (react) — see [ui.md](./ui.md)

**Libraries:** 15 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `frontend/src/store/useDesignStore.js` — imported by **19** files
- `frontend/src/utils/pageSizes.js` — imported by **5** files
- `backend/app.js` — imported by **4** files
- `frontend/src/templates/templates.js` — imported by **4** files
- `backend/services/imageGen/promptTemplates.js` — imported by **3** files
- `backend/services/textImport/docxImport.js` — imported by **3** files

## Required Environment Variables

- `PORT` — `backend/server.js`
- `WISDOM_STUDIO_API_URL` — `mcp-server/client.js`
- `WISDOM_STUDIO_DB_PATH` — `backend/db.js`

---
_Back to [index.md](./index.md) · Generated 2026-07-15_