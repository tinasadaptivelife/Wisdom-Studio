# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**15 library files** across 3 modules

## Frontend (8 files)

- `frontend/src/utils/speech.js` — isDictationSupported, isReadAloudSupported, createRecognizer, readAloud, stopReadingAloud
- `frontend/src/utils/capturePages.js` — waitForPageImages, captureThumbnail, downloadBytes, waitForNextPaint
- `frontend/src/utils/exportPdf.js` — pageSizePt, bookletPageOrder, buildPdfBytes, sanitizeFilename
- `frontend/src/utils/textFlow.js` — estimateCapacity, wrapParagraph, flowTextIntoPages
- `frontend/src/utils/textImport.js` — readPlainTextFile, fileToBase64, readImportedFile
- `frontend/src/utils/id.js` — makeId
- `frontend/src/utils/nudge.js` — nudgeDelta
- `frontend/src/utils/textSelection.js` — extractSelection

## Backend (4 files)

- `backend/services/pdfExport.js` — pxToPt, computeLineX, topLeftToPdfY, wrapTextLines, renderProjectToPdf
- `backend/services/imageGen/promptTemplates.js` — buildPrompt, dimensionsForAspectRatio, DEFAULT_MODEL, STYLE_MODES
- `backend/services/imageGen/modelCatalog.js` — curateModels, isBlockedModelName
- `backend/services/textImport/docxImport.js` — extractDocxText

## Mcp-server (3 files)

- `mcp-server/tools.js` — listTemplates, createProject, setText, addElement, deriveImagePromptFromQuote, generateImage, …
- `mcp-server/templates.js` — getTemplate, PAGE_SIZES, TEMPLATES
- `mcp-server/client.js` — createClient

---
_Back to [overview.md](./overview.md)_