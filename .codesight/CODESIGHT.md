# Wisdom-Studio — AI Context Map

> **Stack:** express | none | react | javascript
> **Monorepo:** wisdom-studio-backend, wisdom-studio-frontend, wisdom-studio-mcp-server

> 14 routes (14 inferred) | 0 models | 15 components | 15 lib files | 4 env vars | 2 middleware | 93% test coverage
> **Token savings:** this file is ~2,700 tokens. Without it, AI exploration would cost ~26,200 tokens. **Saves ~23,500 tokens per conversation.**
> **Last scanned:** 2026-07-15 21:30 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/projects`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Project

## Other Routes

- `GET` `/api/health` `[inferred]`
- `GET` `/api/image-gen/models` `[inferred]` ✓
- `POST` `/api/image-gen/jobs` `[inferred]` ✓
- `POST` `/api/image-gen/jobs/estimate` `[inferred]` ✓
- `POST` `/api/image-gen/alchemy` `[inferred]` ✓
- `GET` `/api/image-gen/alchemy/:jobId` params(jobId) `[inferred]` ✓
- `GET` `/api/image-gen/jobs/:jobId` params(jobId) `[inferred]` ✓
- `GET` `/api/projects/:id/pdf` params(id) [db] `[inferred]` ✓
- `POST` `/api/import/docx` `[inferred]` ✓

---

# Components

- **App** — `frontend/src/App.jsx`
- **AccessibilityBar** — `frontend/src/components/AccessibilityBar.jsx`
- **CanvasStage** — props: onStageReady — `frontend/src/components/Editor/CanvasStage.jsx`
- **EditorLayout** — `frontend/src/components/Editor/EditorLayout.jsx`
- **ElementRenderer** — props: element, isSelected, registerRef, onSelect, onChange, onDblClickText — `frontend/src/components/Editor/ElementRenderer.jsx`
- **GeneratedImageShape** — props: src, width, height — `frontend/src/components/Editor/GeneratedImageShape.jsx`
- **ImageGenerationPanel** — props: element — `frontend/src/components/Editor/ImageGenerationPanel.jsx`
- **LayersPanel** — `frontend/src/components/Editor/LayersPanel.jsx`
- **PagePanel** — `frontend/src/components/Editor/PagePanel.jsx`
- **PlaceholderIcon** — props: boxWidth, boxHeight, color — `frontend/src/components/Editor/PlaceholderIcon.jsx`
- **PropertiesPanel** — `frontend/src/components/Editor/PropertiesPanel.jsx`
- **Toolbar** — `frontend/src/components/Editor/Toolbar.jsx`
- **TopBar** — props: onExportPdf, exportStatus, exportError — `frontend/src/components/Editor/TopBar.jsx`
- **Home** — `frontend/src/components/Home/Home.jsx`
- **TemplatePreview** — props: typeKey, accent — `frontend/src/components/Home/TemplatePreview.jsx`

---

# Libraries

- `backend/services/imageGen/modelCatalog.js` — function curateModels: (liveModels) => void, function isBlockedModelName
- `backend/services/imageGen/promptTemplates.js`
  - function buildPrompt: ({...}, userPrompt }) => void
  - function dimensionsForAspectRatio: (elementWidth, elementHeight, {...}) => void
  - const DEFAULT_MODEL
  - const STYLE_MODES
- `backend/services/pdfExport.js`
  - function pxToPt: (px) => void
  - function computeLineX: (lineWidthPt, boxXPt, boxWidthPt, align) => void
  - function topLeftToPdfY: (elementYpt, elementHeightPt, pageHeightPt) => void
  - function wrapTextLines: (text, font, fontSize, maxWidthPt) => void
  - function renderProjectToPdf: (project, {...}) => void
- `backend/services/textImport/docxImport.js` — function extractDocxText: (buffer) => void
- `frontend/src/utils/capturePages.js`
  - function waitForPageImages: (page, nodeRefs, timeoutMs) => void
  - function captureThumbnail: (stage) => void
  - function downloadBytes: (bytes, filename, mimeType) => void
  - function waitForNextPaint
- `frontend/src/utils/exportPdf.js`
  - function pageSizePt: (pageSizeKey) => void
  - function bookletPageOrder: (pageCount) => void
  - function buildPdfBytes: (pageDataUrls, pageSizeKey, {...}) => void
  - function sanitizeFilename: (name) => void
- `frontend/src/utils/id.js` — function makeId
- `frontend/src/utils/nudge.js` — function nudgeDelta: (key, shiftKey) => void
- `frontend/src/utils/speech.js`
  - function isDictationSupported: () => void
  - function isReadAloudSupported: () => void
  - function createRecognizer: ({...}, onEnd }) => void
  - function readAloud: (text, {...}) => void
  - function stopReadingAloud: () => void
- `frontend/src/utils/textFlow.js`
  - function estimateCapacity: ({...}, height, fontSize, avgCharWidthRatio, lineHeightRatio) => void
  - function wrapParagraph: (paragraph, charsPerLine) => void
  - function flowTextIntoPages: (text, {...}, linesPerPage }) => void
- `frontend/src/utils/textImport.js`
  - function readPlainTextFile: (file) => void
  - function fileToBase64: (file) => void
  - function readImportedFile: (file) => void
- `frontend/src/utils/textSelection.js` — function extractSelection: (text, start, end) => void
- `mcp-server/client.js` — function createClient: (baseUrl) => void
- `mcp-server/templates.js`
  - function getTemplate
  - const PAGE_SIZES
  - const TEMPLATES
- `mcp-server/tools.js`
  - function listTemplates: () => void
  - function createProject: (client, {...}, templateKey, pageSize) => void
  - function setText: (client, {...}, pageIndex, elementName, text }) => void
  - function addElement: (client, {...}, pageIndex, element }) => void
  - function deriveImagePromptFromQuote: (quote) => void
  - function generateImage: (client, {...}, pageIndex, elementName, prompt, mode, model, printQuality, timeoutMs) => void
  - _...2 more_

---

# Config

## Environment Variables

- `AI_HORDE_API_KEY` (has default) — backend/.env.example
- `PORT` **required** — backend/server.js
- `WISDOM_STUDIO_API_URL` **required** — mcp-server/client.js
- `WISDOM_STUDIO_DB_PATH` **required** — backend/db.js

## Config Files

- `backend/.env.example`
- `frontend/vite.config.js`

---

# Middleware

## cors
- GeneratedImageShape — `frontend/src/components/Editor/GeneratedImageShape.jsx`
- cors — `backend/app.js`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `frontend/src/store/useDesignStore.js` — imported by **19** files
- `frontend/src/utils/pageSizes.js` — imported by **5** files
- `backend/app.js` — imported by **4** files
- `frontend/src/templates/templates.js` — imported by **4** files
- `backend/services/imageGen/promptTemplates.js` — imported by **3** files
- `backend/services/textImport/docxImport.js` — imported by **3** files
- `frontend/src/components/Home/Home.jsx` — imported by **3** files
- `frontend/src/components/Editor/EditorLayout.jsx` — imported by **3** files
- `frontend/src/api/imageGenApi.js` — imported by **3** files
- `frontend/src/utils/textImport.js` — imported by **3** files
- `backend/services/imageGen/index.js` — imported by **2** files
- `backend/services/imageGen/modelCatalog.js` — imported by **2** files
- `backend/services/imageGen/aiHordeProvider.js` — imported by **2** files
- `frontend/src/components/AccessibilityBar.jsx` — imported by **2** files
- `frontend/src/utils/textSelection.js` — imported by **2** files
- `frontend/src/api/projectsApi.js` — imported by **2** files
- `frontend/src/utils/exportPdf.js` — imported by **2** files
- `frontend/src/utils/nudge.js` — imported by **2** files
- `frontend/src/components/Editor/PropertiesPanel.jsx` — imported by **2** files
- `frontend/src/components/Editor/ImageGenerationPanel.jsx` — imported by **2** files

## Import Map (who imports what)

- `frontend/src/store/useDesignStore.js` ← `frontend/src/App.jsx`, `frontend/src/a11y.test.jsx`, `frontend/src/components/Editor/CanvasStage.jsx`, `frontend/src/components/Editor/EditorLayout.jsx`, `frontend/src/components/Editor/EditorLayout.test.jsx` +14 more
- `frontend/src/utils/pageSizes.js` ← `frontend/src/components/Editor/CanvasStage.jsx`, `frontend/src/components/Editor/PagePanel.jsx`, `frontend/src/store/useDesignStore.js`, `frontend/src/templates/templates.js`, `frontend/src/utils/exportPdf.js`
- `backend/app.js` ← `backend/routes/imageGen.test.js`, `backend/routes/projects.test.js`, `backend/routes/textImport.test.js`, `backend/server.js`
- `frontend/src/templates/templates.js` ← `frontend/src/components/Home/Home.jsx`, `frontend/src/store/useDesignStore.js`, `frontend/src/store/useDesignStore.js`, `frontend/src/templates/templates.test.js`
- `backend/services/imageGen/promptTemplates.js` ← `backend/routes/imageGen.js`, `backend/services/imageGen/index.js`, `backend/services/imageGen/promptTemplates.test.js`
- `backend/services/textImport/docxImport.js` ← `backend/routes/textImport.js`, `backend/routes/textImport.test.js`, `backend/services/textImport/docxImport.test.js`
- `frontend/src/components/Home/Home.jsx` ← `frontend/src/App.jsx`, `frontend/src/a11y.test.jsx`, `frontend/src/components/Home/Home.test.jsx`
- `frontend/src/components/Editor/EditorLayout.jsx` ← `frontend/src/App.jsx`, `frontend/src/a11y.test.jsx`, `frontend/src/components/Editor/EditorLayout.test.jsx`
- `frontend/src/api/imageGenApi.js` ← `frontend/src/components/Editor/ImageGenerationPanel.jsx`, `frontend/src/store/imageGeneration.test.js`, `frontend/src/store/useDesignStore.js`
- `frontend/src/utils/textImport.js` ← `frontend/src/components/Home/Home.jsx`, `frontend/src/components/Home/Home.test.jsx`, `frontend/src/utils/textImport.test.js`

---

# Test Coverage

> **93%** of routes and models are covered by tests
> 28 test files found

## Covered Routes

- GET:/api/image-gen/models
- POST:/api/image-gen/jobs
- POST:/api/image-gen/jobs/estimate
- POST:/api/image-gen/alchemy
- GET:/api/image-gen/alchemy/:jobId
- GET:/api/image-gen/jobs/:jobId
- GET:/api/projects
- GET:/api/projects/:id
- POST:/api/projects
- PUT:/api/projects/:id
- GET:/api/projects/:id/pdf
- DELETE:/api/projects/:id
- POST:/api/import/docx

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_