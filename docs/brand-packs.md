# Brand packs

This repo contains no one's real brands. It has one neutral built-in look, and everything brand-specific (palettes, fonts, image styles) comes from a **brand pack**: a folder you keep outside the repo, so it can live in a private repo of its own.

## Where the app looks

1. `WISDOM_STUDIO_BRANDS_DIR`, if it is set (for example in `backend/.env`). An empty value means "no pack".
2. Otherwise `~/.wisdom-studio/brands`. A symlink to a folder in your brand repo works.

If the folder isn't there, the app uses the built-in look. If it is there but broken, the app also uses the built-in look and says why: in the server log, and as `error` in the `GET /api/brands` response.

The frontend asks the backend for the brands when the page loads (reload after you change the pack). The MCP server asks on every call. PDF export and image generation read the pack whenever they run.

## Layout

```
<pack>/
  brands.json          the brands, and which font files belong to which family
  fonts/               the font files that brands.json names (optional)
```

## brands.json

```json
{
  "brands": [
    {
      "key": "acme",
      "label": "Acme Studio",
      "shortLabel": "Acme",
      "fonts": { "reading": "Atkinson Hyperlegible", "display": "Acme Display", "displayFallback": "serif" },
      "footerText": "acme.example.com",
      "imageStyle": {
        "label": "Acme look",
        "suffix": ", soft watercolor, warm morning light",
        "negativePrompt": "blurry, low quality, watermark, text"
      },
      "palettes": [
        { "key": "paper-navy", "label": "Paper & Navy", "suffix": "", "background": "#F7F3EA", "border": "#1F3A5F", "headline": "#1F3A5F", "body": "#222222" },
        { "key": "navy-paper", "label": "Navy & Paper", "background": "#1F3A5F", "border": "#F7F3EA", "headline": "#FFFFFF", "body": "#FFFFFF" }
      ]
    }
  ],
  "fontFiles": {
    "Acme Display": { "normal": "acme-display-400.woff", "bold": "acme-display-700.woff" }
  }
}
```

A working sample is in `backend/test/fixtures/brand-pack`.

**Brand**

| Field | |
| --- | --- |
| `key` | Required. Lower-case letters, digits and dashes. Unique. Used in the API, by Claude (`brand`), and as the image style's key. |
| `label` | Required. Shown in the brand picker. |
| `shortLabel` | Optional. Prefixes template titles when there are several brands. Defaults to `label`. |
| `fonts.reading` | Required. Used for every text under 32px and for essential information (details, dates, URLs). Atkinson Hyperlegible is built in. |
| `fonts.display` | Required. Used only for 32px-and-larger names and titles. Use the same family as `reading` for none (titles then use it in bold). |
| `fonts.displayFallback` | Optional. `serif` or `sans-serif` (default), for when the display font hasn't loaded. |
| `footerText` | Optional. The footer line on clip cards. |
| `imageStyle` | Optional. Adds an AI image style named after the brand's `key`. `suffix` is added to the prompt and `negativePrompt` replaces the negative prompt. `label` is the name in the style picker. A brand can't use `general`, `storybook`, `flyer` or `coloring-page` as its key if it has an image style. |
| `palettes` | Required, at least one. |

**Palette**

| Field | |
| --- | --- |
| `key`, `label` | Required. |
| `background`, `border`, `headline`, `body` | Required, `#rrggbb`. |
| `suffix` | Optional. Appended to a template type to make its key (`flyer` + `-navy-paper`). Defaults to `-<brand key>-<palette key>`. An empty suffix gives the bare key (`flyer`), which is what plain, older template keys resolve to, so give it to one palette of the first brand. Every palette across the pack needs a different suffix. |

**Accessibility floor.** The pack is refused unless every palette's headline is at least 4.5:1 and its body text at least 7:1 against its background. The border is decoration only and is not checked.

**fontFiles.** Maps a family name (as used in `fonts.reading` / `fonts.display`) to files in `fonts/`. `bold` is optional (a family with one weight uses it for both). Plain file names only, `.woff`, `.woff2`, `.ttf` or `.otf`. Make sure the license lets you embed the font in PDFs. The browser loads these at startup and PDF export embeds them; a family with no file falls back to Helvetica in PDFs.

## Keeping the pack private

Keep the pack in its own private repository (or any folder outside this one) and point `WISDOM_STUDIO_BRANDS_DIR` at it. Never copy brand names, colors, art or fonts into this repo, its tests or its docs; the tests use the invented brands in `backend/test/fixtures/brand-pack`. The preview build (`npm run build:demo`) has no server and never includes a pack.
