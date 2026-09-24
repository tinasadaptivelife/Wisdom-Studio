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
| `list_templates` | See available starter templates (blank, storybook page, coloring page, lyric/script sheet, quote card, and 6 earth-tone flyer color variants) |
| `create_project` | Create a project from a template |
| `set_text` | Set a named text element's content (e.g. "Headline", "Quote") |
| `add_element` | Add a text/rectangle/ellipse/image-placeholder to a page for custom layouts |
| `generate_image` | Generate an AI image into a named image-placeholder (blocks until done) |
| `export_pdf` | Render a project to a real PDF file and return its path |
| `create_quote_card` | One-call composite: quote + image + PDF, described above |

Every tool that touches a project returns the current project JSON, including each element's `name` — use those names with `set_text`/`generate_image` on subsequent calls. `list_templates` and a project's own element names are the way to discover what's editable; there's no separate schema to memorize.

## Notes

- Generated PDFs are written to a system temp file by default (path returned in the tool result); pass `outputPath` to control where.
- `export_pdf` and `create_quote_card` render server-side with [pdf-lib](https://github.com/Hopding/pdf-lib) directly from the project's element data (crisp vector text, not a rasterized screenshot) — this is different from, and independent of, the in-app "Export to PDF" button, which rasterizes the live canvas. Both produce the same page size and layout.
- If a tool call fails with a connection error, the backend likely isn't running — start it per Prerequisites above.
