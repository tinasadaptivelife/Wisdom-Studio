// Folds the preview build (dist-preview/) into ONE self-contained page,
// dist-preview/preview.html, for hosts that only accept a single HTML file
// with everything inline (fonts are already inlined by Vite in preview mode).
//
// The output is a page *fragment* (title, style, root, script), with no
// <html>/<head>/<body>, because such hosts wrap it in their own skeleton.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '..', 'dist-preview');
const html = readFileSync(path.join(dir, 'index.html'), 'utf-8');

const cssHref = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)?.[1];
const jsSrc = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"/)?.[1];
if (!cssHref || !jsSrc) throw new Error('Could not find the built CSS and JS in dist-preview/index.html');

const css = readFileSync(path.join(dir, cssHref), 'utf-8');
const js = readFileSync(path.join(dir, jsSrc), 'utf-8');

// A literal "</script" inside inline JS would end the script early. Literal
// U+FFFD characters (they appear in a PDF library's encoding tables, inside
// string literals) are written as escapes, which mean the same thing, because
// hosts reject pages that contain the raw character.
const safeJs = js.replaceAll('</script', '<\\/script').replaceAll('\uFFFD', '\\uFFFD');

const page = `<title>Wisdom Studio</title>
<style>${css}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`;

writeFileSync(path.join(dir, 'preview.html'), page);
console.log(`preview.html: ${(page.length / 1024).toFixed(0)} KB`);
