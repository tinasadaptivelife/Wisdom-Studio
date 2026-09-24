import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getTemplate, TEMPLATES, PAGE_SIZES } from './templates.js';

const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 180000;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// A generated image URL from AI Horde is a presigned Cloudflare R2 link that
// expires in ~30 minutes (and the whole request is purged after 10 min of
// staleness). Storing it raw in the project means the art silently breaks
// and re-export 404s. Download it once and inline it as a data URI so the
// saved project is self-contained.
async function inlineRemoteImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/webp';
  return `data:${contentType};base64,${buf.toString('base64')}`;
}

// A reference image for img2img may be given as a local file path, an
// http(s) URL, or an already-encoded data URI. The backend normalizes URLs
// and data URIs to webp itself; only a local path needs reading here.
async function resolveReferenceImage(ref) {
  if (!ref) return undefined;
  if (/^(https?:|data:)/i.test(ref)) return ref;
  const bytes = await readFile(ref);
  return `data:application/octet-stream;base64,${bytes.toString('base64')}`;
}

export function listTemplates() {
  return TEMPLATES.map((t) => ({ key: t.key, title: t.title }));
}

export async function createProject(client, { name, templateKey = 'blank', pageSize = 'letter' } = {}) {
  const template = getTemplate(templateKey);
  const now = new Date().toISOString();
  const project = {
    id: `proj_${randomUUID().slice(0, 8)}`,
    name: name || `${template.title} (via Claude)`,
    templateKey: template.key,
    pageSize,
    pages: [{ id: `page_${randomUUID().slice(0, 8)}`, elements: template.buildPage(pageSize) }],
    createdAt: now,
    updatedAt: now,
  };
  return client.createProject(project);
}

function findElement(page, elementName) {
  const el = page.elements.find((e) => e.name === elementName);
  if (!el) {
    const available = page.elements.map((e) => e.name).join(', ') || '(none)';
    throw new Error(`No element named "${elementName}" on this page. Available elements: ${available}`);
  }
  return el;
}

async function loadPage(client, projectId, pageIndex) {
  const project = await client.getProject(projectId);
  const page = project.pages[pageIndex];
  if (!page) throw new Error(`Project has no page at index ${pageIndex} (it has ${project.pages.length} page(s)).`);
  return { project, page };
}

export async function setText(client, { projectId, pageIndex = 0, elementName, text }) {
  const { project, page } = await loadPage(client, projectId, pageIndex);
  const el = findElement(page, elementName);
  el.text = text;
  return client.updateProject(projectId, project);
}

export async function addElement(client, { projectId, pageIndex = 0, element }) {
  const { project, page } = await loadPage(client, projectId, pageIndex);
  const newEl = { id: `el_${randomUUID().slice(0, 8)}`, rotation: 0, locked: false, visible: true, ...element };
  page.elements.push(newEl);
  return client.updateProject(projectId, project);
}

export function deriveImagePromptFromQuote(quote) {
  return `An evocative illustration that complements this idea, without depicting any text: "${quote}"`;
}

export async function generateImage(
  client,
  {
    projectId,
    pageIndex = 0,
    elementName,
    prompt,
    mode = 'general',
    model,
    printQuality = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    referenceImage,
    referenceStrength,
  }
) {
  const { page } = await loadPage(client, projectId, pageIndex);
  const el = findElement(page, elementName);

  const resolvedReference = await resolveReferenceImage(referenceImage);
  // referenceStrength is the intuitive knob (1 = stay very close to the
  // reference, 0 = only loosely inspired); AI Horde's denoising_strength is
  // its inverse. Default to a middle-ground reinterpretation.
  const denoisingStrength = resolvedReference
    ? clamp(1 - (referenceStrength == null ? 0.35 : Number(referenceStrength)), 0.05, 1)
    : undefined;

  const { jobId } = await client.submitImageJob({
    prompt,
    mode,
    model,
    printQuality,
    // Before the app split "print quality" (dimensions) from post-processing
    // mode, printQuality alone implied an inline RealESRGAN_x2plus pass.
    // Keep that combined behavior for MCP callers so this tool's contract
    // doesn't change.
    ...(printQuality ? { postProcessingMode: 'inline', upscaler: 'RealESRGAN_x2plus' } : {}),
    ...(resolvedReference
      ? { referenceImage: resolvedReference, denoisingStrength }
      : {}),
    targetWidth: el.width,
    targetHeight: el.height,
  });

  const deadline = Date.now() + timeoutMs;
  let status;
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    status = await client.getImageJobStatus(jobId);
    if (status.done) break;
    if (Date.now() > deadline) {
      throw new Error(
        `Image generation timed out after ${Math.round(timeoutMs / 1000)}s (job ${jobId} was still queued/processing — AI Horde can be slow under load; try again or raise timeoutMs).`
      );
    }
  }

  if (status.faulted) {
    throw new Error(status.message || 'Image generation failed on the AI Horde network.');
  }

  const { project, page: freshPage } = await loadPage(client, projectId, pageIndex);
  const freshEl = findElement(freshPage, elementName);
  const image = status.images?.[0];

  let src = image?.url;
  if (src && /^https?:\/\//i.test(src)) {
    try {
      src = await inlineRemoteImage(src);
    } catch {
      // Keep the remote URL if the download fails — a working-for-now link
      // beats no image at all.
    }
  }

  freshEl.type = 'image';
  freshEl.src = src;
  freshEl.prompt = prompt;
  freshEl.mode = mode;
  delete freshEl.label;

  return client.updateProject(projectId, project);
}

export async function listBorderTemplates(client, { tag, brand } = {}) {
  return client.listBorders({ tag, brand });
}

// Fits the border's own aspect ratio inside the page and centers it, rather
// than stretching to the page's exact dimensions — borders are landscape
// (e.g. 672x480) but pages are portrait (816x1056), so a direct stretch
// visibly distorts the art.
function fitBorderToPage(border, pageWidth, pageHeight) {
  const borderAspect = border.width / border.height;
  const pageAspect = pageWidth / pageHeight;
  let width;
  let height;
  if (borderAspect > pageAspect) {
    width = pageWidth;
    height = Math.round(pageWidth / borderAspect);
  } else {
    height = pageHeight;
    width = Math.round(pageHeight * borderAspect);
  }
  return { width, height, x: Math.round((pageWidth - width) / 2), y: Math.round((pageHeight - height) / 2) };
}

export async function addBorderFrame(client, { projectId, pageIndex = 0, borderId }) {
  const border = await client.getBorder(borderId);
  if (!border) {
    throw new Error(`No border found with id "${borderId}". Call list_border_templates to see available borders.`);
  }

  const { project, page } = await loadPage(client, projectId, pageIndex);
  const { width: pageWidth, height: pageHeight } = PAGE_SIZES[project.pageSize] || PAGE_SIZES.letter;
  const { width, height, x, y } = fitBorderToPage(border, pageWidth, pageHeight);

  const frameEl = {
    id: `el_${randomUUID().slice(0, 8)}`,
    type: 'image',
    name: 'Border frame',
    x,
    y,
    width,
    height,
    rotation: 0,
    locked: true,
    visible: true,
    src: `${client.baseUrl}${border.url}`,
  };
  page.elements.unshift(frameEl);

  return client.updateProject(projectId, project);
}

function defaultOutputPath(projectName) {
  const safe = (projectName || 'wisdom-studio-project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'project';
  return path.join(os.tmpdir(), `${safe}-${Date.now()}.pdf`);
}

export async function exportPdf(client, { projectId, outputPath, writeFile }) {
  const [bytes, project] = await Promise.all([client.getProjectPdfBytes(projectId), client.getProject(projectId)]);
  const finalPath = outputPath || defaultOutputPath(project.name);
  await writeFile(finalPath, bytes);
  return { path: finalPath, pageCount: project.pages.length, bytes: bytes.length };
}

export async function createQuoteCard(
  client,
  { quote, author, imagePrompt, style = 'general', pageSize = 'letter', printQuality = false, outputPath, writeFile, timeoutMs }
) {
  if (!quote || !quote.trim()) throw new Error('A quote is required to create a quote card.');

  const project = await createProject(client, {
    name: `Quote card — ${quote.trim().slice(0, 40)}`,
    templateKey: 'quote-card',
    pageSize,
  });

  await setText(client, { projectId: project.id, elementName: 'Quote', text: quote.trim() });
  if (author && author.trim()) {
    await setText(client, { projectId: project.id, elementName: 'Attribution', text: `— ${author.trim()}` });
  }

  await generateImage(client, {
    projectId: project.id,
    elementName: 'Complementary image',
    prompt: imagePrompt?.trim() || deriveImagePromptFromQuote(quote),
    mode: style,
    printQuality,
    timeoutMs,
  });

  const exported = await exportPdf(client, { projectId: project.id, outputPath, writeFile });
  return { projectId: project.id, ...exported };
}
