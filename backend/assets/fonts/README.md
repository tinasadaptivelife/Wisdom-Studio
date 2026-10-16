# Fonts embedded in PDFs

Atkinson Hyperlegible (regular and bold, latin subset, WOFF), copied from the `@fontsource` package. It is licensed under the SIL Open Font License 1.1, which allows embedding and redistribution.

It is the reading font of every design: text under 32px and essential information. `services/pdfFonts.js` maps a template's `fontFamily` to these files. Any other family falls back to Helvetica, unless a brand pack supplies the font (see `docs/brand-packs.md`); pack fonts live in the pack's own `fonts/` folder, not here.
