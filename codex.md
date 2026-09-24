# Project Context

This is a javascript project using express.
It is a monorepo with workspaces: wisdom-studio-backend (backend), wisdom-studio-frontend (frontend), wisdom-studio-mcp-server (mcp-server).

The API has 14 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The UI has 15 components. See .codesight/components.md for the full list with props.
Middleware includes: cors.

High-impact files (most imported, changes here affect many other files):
- frontend/src/store/useDesignStore.js (imported by 19 files)
- frontend/src/utils/pageSizes.js (imported by 5 files)
- backend/app.js (imported by 4 files)
- frontend/src/templates/templates.js (imported by 4 files)
- backend/services/imageGen/promptTemplates.js (imported by 3 files)
- backend/services/textImport/docxImport.js (imported by 3 files)
- frontend/src/components/Home/Home.jsx (imported by 3 files)
- frontend/src/components/Editor/EditorLayout.jsx (imported by 3 files)

Required environment variables (no defaults):
- PORT (backend/server.js)
- WISDOM_STUDIO_API_URL (mcp-server/client.js)
- WISDOM_STUDIO_DB_PATH (backend/db.js)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
