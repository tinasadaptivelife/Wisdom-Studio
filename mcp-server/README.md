# Wisdom Studio MCP Server

Lets Claude drive Wisdom Studio directly — create a project, set text, generate an AI image, and export a finished PDF, all from a chat request. No manual clicking in the app required.

## Prerequisites

The Wisdom Studio **backend** must be running (this server is a thin client of its REST API):

```bash
cd ../backend
npm start
```

It talks to `http://localhost:4000` by default; override with the `WISDOM_STUDIO_API_URL` environment variable if your backend runs elsewhere.

## Install

```bash
npm install
```

## Add it to your Claude client

**Claude Code** (from this directory):

```bash
claude mcp add wisdom-studio -- node "$(pwd)/index.js"
```

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wisdom-studio": {
      "command": "node",
      "args": ["/absolute/path/to/Wisdom-Studio/mcp-server/index.js"]
    }
  }
}
```

Restart your client after adding it.

## What you can ask for

The headline capability — a single request that produces a finished, downloadable PDF:

> "Create a quote card with 'The best way to predict the future is to create it,' attributed to Abraham Lincoln, with a complementary image."

That's the `create_quote_card` tool: it creates the project, sets the quote and attribution, generates a matching AI image via AI Horde, and exports a real vector PDF — one tool call, one finished file. Typically takes 15–60 seconds depending on AI Horde's queue (see the main [README](../README.md) for how your API key's kudos affects generation speed).

## Tools

| Tool | Purpose |
| --- | --- |
| `list_brands` | See the brands the backend's brand pack provides, with each one's palettes and colors (and which have an image style) |
| `list_templates` | See available starter templates. Every type comes in each palette of each brand, so filter with `brand` and/or `typeKey` |
| `create_project` | Create a project from a template. Pass `brand` and optionally `palette` (see `list_brands`) to design in a brand's colors |
| `set_text` | Set a named text element's content (e.g. "Headline", "Quote") |
| `add_element` | Add a text/rectangle/ellipse/image-placeholder to a page for custom layouts |
| `generate_image` | Generate an AI image into a named image-placeholder (blocks until done) |
| `export_pdf` | Render a project to a real PDF file and return its path |
| `create_quote_card` | One-call composite: quote + image + PDF, described above. Accepts `brand` and `palette` |

Every tool that touches a project returns the current project JSON, including each element's `name` — use those names with `set_text`/`generate_image` on subsequent calls. `list_templates` and a project's own element names are the way to discover what's editable; there's no separate schema to memorize.

## Notes

- Generated PDFs are written to a system temp file by default (path returned in the tool result); pass `outputPath` to control where.
- `export_pdf` and `create_quote_card` render server-side with [pdf-lib](https://github.com/Hopding/pdf-lib) directly from the project's element data (crisp vector text, not a rasterized screenshot) — this is different from, and independent of, the in-app "Export to PDF" button, which rasterizes the live canvas. Both produce the same page size and layout.
- If a tool call fails with a connection error, the backend likely isn't running — start it per Prerequisites above.

## Brands

Templates come in the brands of your **brand pack**: a folder outside this repo that the backend reads (`WISDOM_STUDIO_BRANDS_DIR`, default `~/.wisdom-studio/brands`; format in [docs/brand-packs.md](../docs/brand-packs.md)). Without a pack there is one neutral built-in brand. `list_brands` shows what is available, and the MCP server asks the backend on every call, so a change to the pack shows up without restarting Claude. Example:

> "Make a quote card in the second brand, in its dark palette."

That is `create_quote_card` with a `brand` and a `palette` key from `list_brands`. Every palette keeps headline text at 4.5:1 or better and body text at 7:1 or better (the backend refuses a pack that doesn't). Existing template keys (`quote-card`, `flyer-cream-sage`, ...) still work unchanged. A brand with an image style can be passed as `style` to `generate_image` and `create_quote_card` (its key is the brand's key). PDFs embed Atkinson Hyperlegible and any font the pack supplies; other fonts fall back to Helvetica.

`brands.js` here is a copy of the frontend's built-in brand (a test fails if the two drift).

**Clip cards.** `templateKey: "clip-card"` with `pageSize: "story"` (1080x1920) makes a text-only title, quote or end card for a clip (elements: Kicker, Headline, Body, Footer), with the bottom fifth left clear for captions. Also new: page size `youtube-thumbnail` (1280x720).
