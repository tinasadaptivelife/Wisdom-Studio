import { create } from 'zustand';
import { makeId } from '../utils/id.js';
import { getTemplate, getAssetType } from '../templates/templates.js';
import { elementFactories } from '../templates/templates.js';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../utils/pageSizes.js';
import { imageGenApi } from '../api/imageGenApi.js';
import { estimateCapacity, flowTextIntoPages } from '../utils/textFlow.js';

// Templates whose buildPage() output has a single body text element that
// imported content can flow into (see newProjectFromImportedText below).
const IMPORTABLE_TEMPLATE_BODY_ELEMENT = { storybook: 'Story text', flyer: 'Details' };

const HISTORY_LIMIT = 60;
export const IMAGE_GEN_POLL_INTERVAL_MS = 4000;

const makePage = (elements = []) => ({ id: makeId('page'), elements });

const cloneProject = (project) => JSON.parse(JSON.stringify(project));

// Polling timers live outside Zustand state (they aren't serializable and
// must keep running regardless of which panel/component is mounted) keyed
// by the element they're generating an image for.
const pollTimers = new Map();
const clearPollTimer = (elementId) => {
  if (pollTimers.has(elementId)) {
    clearTimeout(pollTimers.get(elementId));
    pollTimers.delete(elementId);
  }
};
const clearAllPollTimers = () => {
  pollTimers.forEach((timer) => clearTimeout(timer));
  pollTimers.clear();
};

const initialState = {
  project: null, // { id, name, pageSize, pages: Page[], updatedAt }
  currentPageIndex: 0,
  selectedElementId: null,
  past: [],
  future: [],
  saveStatus: 'unsaved', // 'unsaved' | 'saving' | 'saved' | 'error'
  lastSavedAt: null,
  imageGeneration: {}, // { [elementId]: { status: 'submitting'|'polling'|'error', waitTimeSeconds?, queuePosition?, message? } }
  imageCostEstimate: {}, // { [elementId]: { status: 'loading'|'ready'|'error', kudos?, message? } }
  alchemyUpscale: {}, // { [elementId]: { status: 'submitting'|'polling'|'done'|'error', url?, message? } }
  announce: '', // text for the canvas-action aria-live region (EditorLayout)
};

const ADD_ELEMENT_LABEL = {
  text: 'Text box',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  'image-placeholder': 'Image placeholder',
};

const ANNOUNCE_DELAY_MS = 50;

export const useDesignStore = create((set, get) => ({
  ...initialState,

  // ---------- project lifecycle ----------
  newProjectFromTemplate(templateKey, pageSize = DEFAULT_PAGE_SIZE) {
    clearAllPollTimers();
    const template = getTemplate(templateKey);
    // Default project name uses the asset type's name ("Flyer"), not the
    // specific variant's ("Bold flyer") — the variant is a starting layout,
    // not something the user thinks of as part of their project's identity.
    const assetTypeTitle = getAssetType(template.typeKey)?.title ?? template.title;
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const project = {
      id: makeId('proj'),
      name: `${assetTypeTitle} — ${dateLabel}`,
      templateKey,
      pageSize,
      pages: [makePage(template.buildPage(pageSize))],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({
      project,
      currentPageIndex: 0,
      selectedElementId: null,
      past: [],
      future: [],
      saveStatus: 'unsaved',
      lastSavedAt: null,
      imageGeneration: {},
      imageCostEstimate: {},
      alchemyUpscale: {},
    });
  },

  // ---------- content import (Phase 3) ----------
  newProjectFromImportedText({ text, templateKey, pageSize = DEFAULT_PAGE_SIZE, name }) {
    clearAllPollTimers();
    const resolvedTemplateKey = IMPORTABLE_TEMPLATE_BODY_ELEMENT[templateKey] ? templateKey : 'storybook';
    const bodyElementName = IMPORTABLE_TEMPLATE_BODY_ELEMENT[resolvedTemplateKey];
    const template = getTemplate(resolvedTemplateKey);

    const sampleBody = template.buildPage(pageSize).find((el) => el.name === bodyElementName);
    const capacity = estimateCapacity({
      width: sampleBody.width,
      height: sampleBody.height,
      fontSize: sampleBody.fontSize,
    });

    const chunks = flowTextIntoPages(text, capacity);
    const pageTexts = chunks.length ? chunks : [''];

    const pages = pageTexts.map((chunk) => {
      const elements = template.buildPage(pageSize);
      elements.find((el) => el.name === bodyElementName).text = chunk;
      return makePage(elements);
    });

    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const project = {
      id: makeId('proj'),
      name: name?.trim() || `Imported story — ${dateLabel}`,
      templateKey: resolvedTemplateKey,
      pageSize,
      pages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({
      project,
      currentPageIndex: 0,
      selectedElementId: null,
      past: [],
      future: [],
      saveStatus: 'unsaved',
      lastSavedAt: null,
      imageGeneration: {},
      imageCostEstimate: {},
      alchemyUpscale: {},
    });
  },

  loadProject(project) {
    clearAllPollTimers();
    set({
      project,
      currentPageIndex: 0,
      selectedElementId: null,
      past: [],
      future: [],
      saveStatus: 'saved',
      lastSavedAt: project.updatedAt ?? null,
      imageGeneration: {},
      imageCostEstimate: {},
      alchemyUpscale: {},
    });
  },

  closeProject() {
    clearAllPollTimers();
    set({ ...initialState });
  },

  setProjectName(name) {
    get()._mutate((project) => {
      project.name = name;
    });
  },

  setPageSize(pageSize) {
    get()._mutate((project) => {
      project.pageSize = pageSize;
    });
  },

  markSaving() {
    set({ saveStatus: 'saving' });
  },
  markSaved(timestamp) {
    set({ saveStatus: 'saved', lastSavedAt: timestamp ?? new Date().toISOString() });
  },
  markSaveError() {
    set({ saveStatus: 'error' });
  },

  // Clears the live region first, then sets the message on a short delay —
  // otherwise two identical consecutive announcements (e.g. adding two text
  // boxes in a row) wouldn't re-announce, since screen readers key off the
  // region's text actually changing, not React re-rendering it.
  _announce(message) {
    set({ announce: '' });
    setTimeout(() => set({ announce: message }), ANNOUNCE_DELAY_MS);
  },

  // ---------- internal history-aware mutation helper ----------
  _mutate(fn, { pushHistory = true } = {}) {
    const { project, past } = get();
    if (!project) return;
    const draft = cloneProject(project);
    fn(draft);
    draft.updatedAt = new Date().toISOString();
    set({
      project: draft,
      past: pushHistory ? [...past, cloneProject(project)].slice(-HISTORY_LIMIT) : past,
      future: pushHistory ? [] : get().future,
      saveStatus: 'unsaved',
    });
  },

  undo() {
    const { past, project, future } = get();
    if (past.length === 0 || !project) return;
    const previous = past[past.length - 1];
    set({
      project: previous,
      past: past.slice(0, -1),
      future: [cloneProject(project), ...future].slice(0, HISTORY_LIMIT),
      selectedElementId: null,
      saveStatus: 'unsaved',
    });
  },

  redo() {
    const { future, project, past } = get();
    if (future.length === 0 || !project) return;
    const next = future[0];
    set({
      project: next,
      future: future.slice(1),
      past: [...past, cloneProject(project)].slice(-HISTORY_LIMIT),
      selectedElementId: null,
      saveStatus: 'unsaved',
    });
  },

  // ---------- pages ----------
  addPage() {
    get()._mutate((project) => {
      project.pages.push(makePage([]));
    });
    const newIndex = get().project.pages.length - 1;
    set({ currentPageIndex: newIndex, selectedElementId: null });
    get()._announce(`Page ${newIndex + 1} added`);
  },

  duplicatePage(index) {
    get()._mutate((project) => {
      const source = project.pages[index];
      const copy = { ...cloneProject(source), id: makeId('page') };
      copy.elements = copy.elements.map((el) => ({ ...el, id: makeId('el') }));
      project.pages.splice(index + 1, 0, copy);
    });
    set({ currentPageIndex: index + 1, selectedElementId: null });
  },

  deletePage(index) {
    const { project } = get();
    if (!project || project.pages.length <= 1) return;
    get()._mutate((draft) => {
      draft.pages.splice(index, 1);
    });
    set({
      currentPageIndex: Math.max(0, Math.min(index, get().project.pages.length - 1)),
      selectedElementId: null,
    });
    get()._announce('Page deleted');
  },

  goToPage(index) {
    set({ currentPageIndex: index, selectedElementId: null });
  },

  // ---------- elements ----------
  addElement(kind) {
    const { currentPageIndex } = get();
    let element;
    if (kind === 'text') element = elementFactories.textEl({});
    else if (kind === 'rect') element = elementFactories.shapeEl('rect', {});
    else if (kind === 'ellipse') element = elementFactories.shapeEl('ellipse', {});
    else if (kind === 'image-placeholder') element = elementFactories.imagePlaceholderEl({});
    else return;

    get()._mutate((project) => {
      project.pages[currentPageIndex].elements.push(element);
    });
    set({ selectedElementId: element.id });
    get()._announce(`${ADD_ELEMENT_LABEL[kind]} added`);
  },

  updateElement(elementId, patch, { pushHistory = true } = {}) {
    const { currentPageIndex } = get();
    get()._mutate(
      (project) => {
        const page = project.pages[currentPageIndex];
        const el = page.elements.find((e) => e.id === elementId);
        if (el) Object.assign(el, patch);
      },
      { pushHistory }
    );
  },

  deleteElement(elementId) {
    const { currentPageIndex, selectedElementId, project: currentProject } = get();
    const deletedName = currentProject?.pages[currentPageIndex]?.elements.find((e) => e.id === elementId)?.name;
    get()._mutate((project) => {
      const page = project.pages[currentPageIndex];
      page.elements = page.elements.filter((e) => e.id !== elementId);
    });
    if (selectedElementId === elementId) set({ selectedElementId: null });

    clearPollTimer(elementId);
    clearPollTimer(`alchemy:${elementId}`);
    if (get().imageGeneration[elementId]) {
      set((state) => {
        const next = { ...state.imageGeneration };
        delete next[elementId];
        return { imageGeneration: next };
      });
    }
    if (get().imageCostEstimate[elementId]) {
      set((state) => {
        const next = { ...state.imageCostEstimate };
        delete next[elementId];
        return { imageCostEstimate: next };
      });
    }
    if (get().alchemyUpscale[elementId]) {
      set((state) => {
        const next = { ...state.alchemyUpscale };
        delete next[elementId];
        return { alchemyUpscale: next };
      });
    }
    get()._announce(`${deletedName || 'Element'} deleted`);
  },

  selectElement(elementId) {
    set({ selectedElementId: elementId });
  },

  reorderElement(elementId, direction) {
    // direction: 'front' | 'back' | 'forward' | 'backward'
    const { currentPageIndex } = get();
    get()._mutate((project) => {
      const page = project.pages[currentPageIndex];
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx === -1) return;
      const [el] = page.elements.splice(idx, 1);
      if (direction === 'front') page.elements.push(el);
      else if (direction === 'back') page.elements.unshift(el);
      else if (direction === 'forward') page.elements.splice(Math.min(idx + 1, page.elements.length), 0, el);
      else if (direction === 'backward') page.elements.splice(Math.max(idx - 1, 0), 0, el);
    });
  },

  alignElement(elementId, alignment) {
    const { project, currentPageIndex } = get();
    if (!project) return;
    const { width: pageWidth, height: pageHeight } = PAGE_SIZES[project.pageSize];
    const page = project.pages[currentPageIndex];
    const el = page.elements.find((e) => e.id === elementId);
    if (!el) return;
    const patch = {};
    if (alignment === 'left') patch.x = 0;
    if (alignment === 'center-h') patch.x = (pageWidth - el.width) / 2;
    if (alignment === 'right') patch.x = pageWidth - el.width;
    if (alignment === 'top') patch.y = 0;
    if (alignment === 'center-v') patch.y = (pageHeight - el.height) / 2;
    if (alignment === 'bottom') patch.y = pageHeight - el.height;
    get().updateElement(elementId, patch);
  },

  // ---------- AI image generation ----------
  // Lives at the store level (not component state) so polling survives the
  // user deselecting the element or navigating to another panel/page.
  async generateImageForElement(elementId, { prompt, mode, model, printQuality, postProcessingMode, upscaler }) {
    clearPollTimer(elementId);
    const setGenState = (patch) =>
      set((state) => ({ imageGeneration: { ...state.imageGeneration, [elementId]: patch } }));

    setGenState({ status: 'submitting' });

    const { project, currentPageIndex } = get();
    const el = project?.pages[currentPageIndex]?.elements.find((e) => e.id === elementId);
    const targetWidth = el?.width ?? 512;
    const targetHeight = el?.height ?? 512;

    let jobId;
    let resolvedModel = model;
    try {
      const result = await imageGenApi.submitJob({
        prompt,
        mode,
        model,
        targetWidth,
        targetHeight,
        printQuality,
        postProcessingMode,
        upscaler,
      });
      jobId = result.jobId;
      resolvedModel = result.model;
    } catch (err) {
      setGenState({ status: 'error', message: err.message });
      return;
    }

    await new Promise((resolve) => {
      const poll = async () => {
        let status;
        try {
          status = await imageGenApi.getJobStatus(jobId);
        } catch (err) {
          pollTimers.delete(elementId);
          setGenState({ status: 'error', message: err.message });
          resolve();
          return;
        }

        // The element (or the whole project) may have been removed while this was in flight.
        if (!get().imageGeneration[elementId]) {
          resolve();
          return;
        }

        if (!status.done) {
          setGenState({ status: 'polling', waitTimeSeconds: status.waitTimeSeconds, queuePosition: status.queuePosition });
          pollTimers.set(elementId, setTimeout(poll, IMAGE_GEN_POLL_INTERVAL_MS));
          return;
        }

        pollTimers.delete(elementId);

        if (status.faulted) {
          setGenState({ status: 'error', message: status.message || 'Generation failed.' });
          resolve();
          return;
        }

        const image = status.images?.[0];
        get().updateElement(elementId, {
          type: 'image',
          src: image?.url,
          prompt,
          mode,
          model: resolvedModel,
        });
        set((state) => {
          const next = { ...state.imageGeneration };
          delete next[elementId];
          return { imageGeneration: next };
        });
        get()._announce(`Image added to page ${get().currentPageIndex + 1}`);
        resolve();
      };

      pollTimers.set(elementId, setTimeout(poll, IMAGE_GEN_POLL_INTERVAL_MS));
    });
  },

  async estimateImageCost(elementId, { prompt, mode, model, printQuality }) {
    const setEstState = (patch) =>
      set((state) => ({ imageCostEstimate: { ...state.imageCostEstimate, [elementId]: patch } }));

    setEstState({ status: 'loading' });

    const { project, currentPageIndex } = get();
    const el = project?.pages[currentPageIndex]?.elements.find((e) => e.id === elementId);
    const targetWidth = el?.width ?? 512;
    const targetHeight = el?.height ?? 512;

    try {
      const result = await imageGenApi.estimateCost({ prompt, mode, model, targetWidth, targetHeight, printQuality });
      setEstState({ status: 'ready', kudos: result.kudos });
    } catch (err) {
      setEstState({ status: 'error', message: err.message });
    }
  },

  // Alchemy ("interrogation" in the AI Horde API) upscales an already-
  // completed generation's public image URL — unlike inline post-processing,
  // it never touches the in-flight job, so the original stays on the canvas
  // untouched. Runs on its own poll timer (keyed separately from the main
  // generation) so it can't collide with an in-flight regenerate of the same
  // element.
  async upscaleImageViaAlchemy(elementId, { upscaler, sourceImageUrl: sourceImageUrlOverride }) {
    const timerKey = `alchemy:${elementId}`;
    clearPollTimer(timerKey);
    const setAlchemyState = (patch) =>
      set((state) => ({ alchemyUpscale: { ...state.alchemyUpscale, [elementId]: patch } }));

    setAlchemyState({ status: 'submitting' });

    const { project, currentPageIndex } = get();
    const el = project?.pages[currentPageIndex]?.elements.find((e) => e.id === elementId);
    const sourceImageUrl = sourceImageUrlOverride ?? el?.src;

    let jobId;
    try {
      const result = await imageGenApi.submitAlchemy({ sourceImageUrl, upscaler });
      jobId = result.jobId;
    } catch (err) {
      setAlchemyState({ status: 'error', message: err.message });
      return;
    }

    await new Promise((resolve) => {
      const poll = async () => {
        let status;
        try {
          status = await imageGenApi.getAlchemyStatus(jobId);
        } catch (err) {
          pollTimers.delete(timerKey);
          setAlchemyState({ status: 'error', message: err.message });
          resolve();
          return;
        }

        // The element (or the whole project) may have been removed while this was in flight.
        if (!get().alchemyUpscale[elementId]) {
          resolve();
          return;
        }

        if (!status.done) {
          setAlchemyState({ status: 'polling' });
          pollTimers.set(timerKey, setTimeout(poll, IMAGE_GEN_POLL_INTERVAL_MS));
          return;
        }

        pollTimers.delete(timerKey);

        if (status.faulted) {
          setAlchemyState({ status: 'error', message: status.message || 'Alchemy upscaling failed.' });
          resolve();
          return;
        }

        setAlchemyState({ status: 'done', url: status.url });
        resolve();
      };

      pollTimers.set(timerKey, setTimeout(poll, IMAGE_GEN_POLL_INTERVAL_MS));
    });
  },

  // The "use this one" swap in the A/B comparison — applies the Alchemy
  // result to the canvas element and clears the pending comparison state.
  useAlchemyResult(elementId) {
    const entry = get().alchemyUpscale[elementId];
    if (!entry?.url) return;
    get().updateElement(elementId, { src: entry.url });
    set((state) => {
      const next = { ...state.alchemyUpscale };
      delete next[elementId];
      return { alchemyUpscale: next };
    });
  },
}));
