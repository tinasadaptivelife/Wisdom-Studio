# Wisdom Studio

A free, open-source, Canva-like design app for creating print-ready PDFs — coloring pages, flyers, storybooks, and lyric/script sheets. Built accessible-first for adults 50+.

This README covers **Phase 1 (Canvas editor foundation)** and **Phase 2 (AI image generation)**. Later phases (content import, PDF export, full accessibility pass) are not built yet — see `Spec.md` for the full roadmap.

## What's in Phase 1

- Blank canvas with draggable/resizable/rotatable text boxes, shapes (rectangle, ellipse), and image placeholders
- Multi-page documents (add, duplicate, delete, navigate pages)
- Four starter templates: coloring page, flyer, storybook page, lyric/script sheet — plus a blank canvas
- Layers panel (select, show/hide, lock, reorder, delete)
- Undo/redo (toolbar buttons and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- Resize/rotate via on-canvas handles; numeric position/size controls in the Properties panel
- Align-to-page tools (left/center/right, top/middle/bottom) and bring-to-front/send-to-back
- Save/load projects locally, with autosave and a "last saved" indicator

Baked in from the start (a down payment on the full Phase 5 accessibility pass): every button is a real `<button>` with a plain-language label and a minimum 44×44px tap target, focus outlines are preserved, the base font size is 16px, and there's a skip-to-content link. The full accessibility feature set — font-size slider, high-contrast toggle, dictation, text-to-speech, live-region announcements — is scoped for Phase 5 and not yet built.

## What's in Phase 2

Select any image placeholder on the canvas and the Properties panel shows a **Generate with AI** section:

- A prompt field, a style picker (General / Storybook illustration / Flyer graphic / Coloring page line art), and a model picker populated live from AI Horde's currently-available Stable Diffusion models
- Submitting shows a friendly, persistent progress state — "Sending your request to AI Horde…" then "Generating your image… queue position N, about Ns left" — updated by polling every 4s. This runs at the store level, not component state, so it keeps going even if you deselect the element or switch pages
- On success the placeholder becomes a real image layer — draggable, resizable, rotatable exactly like every other layer, since it reuses the same transform code path
- On failure (or a faulted job), a clear error message with a **Retry** button; **Clear image** reverts a generated image back to an empty placeholder
- Coloring-page mode prompts for black-and-white line art (no shading/color, explicit negative prompts) suitable for printing

**Image generation is behind a provider adapter** (`backend/services/imageGen/provider.interface.js`), currently implemented by `aiHordeProvider.js`. Swapping in a self-hosted backend (FLUX.1-schnell or SDXL via ComfyUI) later means writing one file that satisfies that interface and changing one line in `backend/services/imageGen/index.js` — `routes/imageGen.js` never talks to AI Horde directly.

**Setup:** add your AI Horde API key to `backend/.env` as `AI_HORDE_API_KEY` (get one free at [aihorde.net/register](https://aihorde.net/register)). A `.env` with the shared anonymous key (`0000000000`) is already there so generation works out of the box — but the anonymous key is heavily deprioritized (expect a long queue, tens of minutes under load); a free registered key jumps you ahead of it. `.env` is gitignored; `.env.example` documents the variable.

Generation has two quality tiers. Standard (default) caps at 576px on a side (snapped to a multiple of 64) because AI Horde requires extra kudos balance for anything over 665×665 — most anonymous/new keys don't have it, and this keeps things working without configuration. Checking **"Print quality"** in the Generate panel raises the cap to 1024px and adds a RealESRGAN 2× upscale pass (final images ~1536–2048px — genuinely printable at letter size); it costs more kudos, and `allow_downgrade` is set so low-balance keys get a smaller image instead of an error. All generations use AI Horde's recommended `k_euler_a` sampler with karras scheduling at 28 steps, and set `shared: true` (donates images to the LAION dataset, which also reduces kudos cost).

## What's in Phase 4 (partial) — PDF export

- In-app **Export to PDF** (top bar) rasterizes the live canvas page-by-page via Konva and assembles a PDF client-side (`frontend/src/utils/exportPdf.js`, pdf-lib).
- The backend also renders PDFs **server-side**, directly from a project's element data — real vector text, not a screenshot (`backend/services/pdfExport.js`, also pdf-lib; images are converted from AI Horde's webp via `sharp`). Available at `GET /api/projects/:id/pdf`. This is what makes headless, MCP-driven export possible (see below) — there's no browser involved.
- Six templates now, including **Quote card** (a quote + attribution + complementary image, sized for print).

## MCP server — let Claude drive Wisdom Studio directly

`mcp-server/` exposes the app as MCP tools, so a single chat request like *"create a quote card about resilience with a matching image"* produces a real, finished PDF — no manual clicking. See [`mcp-server/README.md`](mcp-server/README.md) for setup and the full tool list.

## Project structure

```
Wisdom-Studio/
├── frontend/    React + Vite + Konva (react-konva) canvas editor
├── backend/     Express + SQLite (Node's built-in node:sqlite) — project storage
│                + services/imageGen/ (AI Horde adapter behind a provider interface)
│                + services/pdfExport.js (server-side vector PDF rendering)
└── mcp-server/  MCP tools so Claude can create/edit/export projects directly
```

## Running it locally

You need Node.js 22+ (this was built and tested on Node 25, which is required for the built-in `node:sqlite` module the backend uses).

**1. Install dependencies** (once):

```bash
cd backend && npm install
cd ../frontend && npm install
```

**2. Start the backend** (in one terminal):

```bash
cd backend
npm run dev
```

This runs on `http://localhost:4000` and stores projects in a SQLite file at `backend/data/wisdom-studio.sqlite` (created automatically, gitignored). It also loads `backend/.env` on startup for `AI_HORDE_API_KEY` (see Phase 2, above).

**3. Start the frontend** (in another terminal):

```bash
cd frontend
npm run dev
```

This runs on `http://localhost:5173` and proxies `/api/*` requests to the backend. Open that URL in a browser.

## Testing

Both packages use [Vitest](https://vitest.dev). Each has its own `vitest.config.js` — kept separate from `vite.config.js` on purpose, so test environment/setup is one obvious file rather than logic buried in individual test files.

```bash
cd backend && npm test        # one-shot run — projects CRUD + AI Horde adapter/prompt templates/routes, all with fetch mocked
cd frontend && npm test       # one-shot run — store logic (incl. image generation polling) + a Home component smoke test

npm run test:watch            # in either package — reruns on save, for TDD
```

Backend tests never touch your real project data or the real AI Horde API: `vitest.config.js` sets `WISDOM_STUDIO_DB_PATH=:memory:` and a fake `AI_HORDE_API_KEY`, and `aiHordeProvider.test.js` / `routes/imageGen.test.js` mock `fetch`/the provider rather than making network calls. `app.js` (the Express app, no `.listen()`) is separate from `server.js` (starts it, loads `.env`) specifically so tests can exercise real HTTP requests without binding the port your dev server already uses.

Frontend tests run in `jsdom` with React Testing Library. `useDesignStore.test.js` covers templates, element CRUD, undo/redo, layer reordering, and page alignment math; `imageGeneration.test.js` uses fake timers to drive the submit→poll→complete/error/delete-mid-generation flow deterministically, with `imageGenApi` mocked — no real network or real waiting involved.

## Adding your own border artwork

The repo ships no border images — `backend/assets/borders/manifest.json` is an empty list. To add your own, drop image files into `backend/assets/borders/` and list them in a `manifest.local.json` beside it (same shape as the entries in `backend/test/fixtures/borders/manifest.json`). Everything in that folder except the shared `manifest.json` is gitignored, so personal or licensed artwork stays on your machine.

## Fixed: a real data-loss bug (SQLite WAL)

`db.js` briefly ran the project database in WAL journal mode. WAL is fine for concurrent multi-process access, which this single-process app never has — and it comes with a real cost here: writes can sit unflushed in a separate `.sqlite-wal` file and vanish if the process is killed before a checkpoint runs, even though the API had already reported the save as successful. That's exactly what happened during development — a large batch of test projects were lost to an ungraceful backend restart. Fixed by using SQLite's default rollback-journal mode, which commits each write directly and atomically to the main `.sqlite` file; verified by creating a project and then `kill -9`-ing the backend mid-session — the write survived. `db.test.js` has a regression test asserting journal mode is never `wal` for the file-backed database.

## Known limitations

- No zoom/pan on the canvas yet — pages are shown at fixed screen size (816×1056px for US Letter, matching 96dpi) inside a scrollable viewport.
- Layer reordering in the Layers panel is done via up/down buttons rather than drag-and-drop, chosen for reliable keyboard operability — full drag-and-drop can be added later without changing the underlying data model.
- `npm audit` flags a moderate advisory in Vite's dev-only `esbuild` dependency (a dev server CORS issue) in the **frontend** package specifically (backend's Vitest is on a newer version that doesn't have it). It only affects `vite dev`, not the built app, and fixing it requires a Vite major-version bump — left as-is for now; worth revisiting before this ever runs on a shared network.
- The image-gen prompt panel only appears when an image-placeholder (or already-generated image) element is selected — there's no separate free-floating "generate an image" flow that isn't tied to a placeholder on the canvas.
- Model/style choices aren't remembered between sessions; each newly-selected placeholder starts from the template's default style and the first model in AI Horde's list.

## License

MIT — see [LICENSE](LICENSE).
