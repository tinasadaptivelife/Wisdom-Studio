# Wisdom Studio — working notes

Full setup/run/test instructions live in [README.md](README.md). This file is project behavior, not documentation.

## This project is built TDD — red, green, refactor

For new behavior (a new store action, a new API route, a new validation rule, a bug fix), write the test first:

1. **Red** — add a test in the relevant suite that expresses the behavior and fails (or doesn't compile/run) because the behavior doesn't exist yet. Run it, confirm it fails for the *expected* reason, not a typo.
2. **Green** — write the minimum implementation code to make that test pass. Run the suite, confirm green.
3. **Refactor** — clean up implementation or test code now that it's covered, re-run to confirm still green.

Don't write the implementation first and backfill a test afterward — the test-first order is the point, since it's what proves the test actually exercises the new behavior instead of just describing what the code happens to do. Pure logic (store actions, route handlers, alignment/undo math) is the easiest place to do this — reach for it before touching UI wiring or manual browser verification.

Exceptions where test-first doesn't apply: pure layout/CSS/visual changes, one-off scripts, and exploratory spikes you intend to throw away — verify those by hand instead.

## Run tests as part of making changes

`backend/` and `frontend/` each have their own Vitest suite (`npm test` = one-shot, `npm run test:watch` for the red-green-refactor loop). Whenever you change code in either package:

- Run `npm test` in that package before considering the change done — not only when explicitly asked to "run tests" or "verify."
- If the change adds behavior with no existing coverage (store logic in `frontend/src/store/useDesignStore.js`, API routes in `backend/routes/`), add a test for it *before* the implementation, per the TDD workflow above, rather than relying on manual browser checks alone.
- Backend tests never touch the real project database — `vitest.config.js` points `WISDOM_STUDIO_DB_PATH` at `:memory:`. Don't route tests through `backend/data/wisdom-studio.sqlite`.


# Wisdom-Studio — Project Context

**Stack:** express | none | javascript
**Monorepo:** wisdom-studio-backend, wisdom-studio-frontend, wisdom-studio-mcp-server

14 routes | 0 models | 4 env vars | 98 import links

**API areas:** /api/health, /api/image-gen, /api/projects, /api/import

**High-impact files** (change carefully):
- frontend/src/store/useDesignStore.js (imported by 19 files)
- frontend/src/utils/pageSizes.js (imported by 5 files)
- backend/app.js (imported by 4 files)
- frontend/src/templates/templates.js (imported by 4 files)
- backend/services/imageGen/promptTemplates.js (imported by 3 files)

**Required env vars:** PORT, WISDOM_STUDIO_API_URL, WISDOM_STUDIO_DB_PATH

---

## Instructions for Claude Code

### Two-Step Rule (mandatory)
**Step 1 — Orient:** Use wiki articles to find WHERE things live.
**Step 2 — Verify:** Read the actual source files listed in the wiki article BEFORE writing any code.

Wiki articles are structural summaries extracted by AST. They show routes, models, and file locations.
They do NOT show full function logic, middleware internals, or dynamic runtime behavior.
**Never write or modify code based solely on wiki content — always read source files first.**

Read in order at session start:
1. `.codesight/wiki/index.md` — orientation map (~200 tokens)
2. `.codesight/wiki/overview.md` — architecture overview (~500 tokens)
3. Domain article (e.g. `.codesight/wiki/auth.md`) → check "Source Files" section → read those files
4. `.codesight/CODESIGHT.md` — full context map for deep exploration

Routes marked `[inferred]` in wiki articles were detected via regex — verify against source before trusting.
If any source file shows ⚠ in the wiki, re-run `npx codesight --wiki` before proceeding.

Or use the codesight MCP server for on-demand queries:
   - `codesight_get_wiki_article` — read a specific wiki article by name
   - `codesight_get_wiki_index` — get the wiki index
   - `codesight_get_summary` — quick project overview
   - `codesight_get_routes --prefix /api/users` — filtered routes
   - `codesight_get_blast_radius --file src/lib/db.ts` — impact analysis before changes
   - `codesight_get_schema --model users` — specific model details

Only open specific files after consulting codesight context. This saves ~23,454 tokens per conversation.
