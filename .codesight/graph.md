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
