import { beforeEach, describe, it, expect } from 'vitest';
import { useDesignStore } from './useDesignStore.js';

const getState = () => useDesignStore.getState();

beforeEach(() => {
  getState().closeProject();
});

describe('newProjectFromTemplate', () => {
  it('seeds a blank project with one empty page', () => {
    getState().newProjectFromTemplate('blank');
    const { project } = getState();
    expect(project.pages).toHaveLength(1);
    expect(project.pages[0].elements).toHaveLength(0);
    expect(project.pageSize).toBe('letter');
  });

  it('seeds a flyer project with a locked brand background, headline, image placeholder, and details text', () => {
    getState().newProjectFromTemplate('flyer');
    const { project } = getState();
    const types = project.pages[0].elements.map((e) => e.type);
    expect(types).toEqual(['rect', 'text', 'image-placeholder', 'text']);
    expect(project.pages[0].elements[0]).toMatchObject({ name: 'Brand background', locked: true });
  });

  it('gives the project a friendly, dated default name instead of "Untitled"', () => {
    getState().newProjectFromTemplate('flyer');
    const { project } = getState();
    expect(project.name).not.toMatch(/^Untitled/);
    expect(project.name).toMatch(/^Flyer — /);
  });

  it('seeds a quote card with a locked brand background, an image placeholder, a quote, and an attribution', () => {
    getState().newProjectFromTemplate('quote-card');
    const { project } = getState();
    const [background, image, quote, attribution] = project.pages[0].elements;
    expect(background).toMatchObject({ type: 'rect', name: 'Brand background', locked: true });
    expect(image.type).toBe('image-placeholder');
    expect(quote.type).toBe('text');
    expect(quote.align).toBe('center');
    expect(attribution.type).toBe('text');
    // The quote sits below the image, and the attribution below the quote.
    expect(quote.y).toBeGreaterThan(image.y + image.height);
    expect(attribution.y).toBeGreaterThan(quote.y + quote.height);
  });
});

describe('setPageSize', () => {
  beforeEach(() => {
    getState().newProjectFromTemplate('blank');
  });

  it('changes the project page size', () => {
    getState().setPageSize('a4');
    expect(getState().project.pageSize).toBe('a4');
  });

  it('is undoable, like other project edits', () => {
    getState().setPageSize('a4');
    getState().undo();
    expect(getState().project.pageSize).toBe('letter');
  });
});

describe('element CRUD', () => {
  beforeEach(() => {
    getState().newProjectFromTemplate('blank');
  });

  it('addElement appends an element to the current page and selects it', () => {
    getState().addElement('rect');
    const { project, selectedElementId } = getState();
    expect(project.pages[0].elements).toHaveLength(1);
    expect(project.pages[0].elements[0].type).toBe('rect');
    expect(selectedElementId).toBe(project.pages[0].elements[0].id);
  });

  it('updateElement patches only the targeted element', () => {
    getState().addElement('text');
    const id = getState().project.pages[0].elements[0].id;
    getState().updateElement(id, { x: 123, text: 'Hello' });
    const el = getState().project.pages[0].elements[0];
    expect(el.x).toBe(123);
    expect(el.text).toBe('Hello');
  });

  it('deleteElement removes it and clears selection if it was selected', () => {
    getState().addElement('ellipse');
    const id = getState().project.pages[0].elements[0].id;
    getState().deleteElement(id);
    expect(getState().project.pages[0].elements).toHaveLength(0);
    expect(getState().selectedElementId).toBeNull();
  });
});

describe('undo/redo', () => {
  beforeEach(() => {
    getState().newProjectFromTemplate('blank');
  });

  it('undo reverts the last mutation and redo restores it', () => {
    getState().addElement('rect');
    const id = getState().project.pages[0].elements[0].id;
    getState().updateElement(id, { x: 999 });
    expect(getState().project.pages[0].elements[0].x).toBe(999);

    getState().undo();
    expect(getState().project.pages[0].elements[0].x).not.toBe(999);

    getState().redo();
    expect(getState().project.pages[0].elements[0].x).toBe(999);
  });

  it('undo past the beginning is a no-op', () => {
    const before = getState().project;
    getState().undo();
    expect(getState().project).toEqual(before);
  });

  it('a new mutation after undo clears the redo stack', () => {
    getState().addElement('rect');
    getState().addElement('ellipse');
    getState().undo();
    expect(getState().future.length).toBeGreaterThan(0);

    getState().addElement('text');
    expect(getState().future).toHaveLength(0);
  });
});

describe('reorderElement', () => {
  beforeEach(() => {
    getState().newProjectFromTemplate('blank');
    getState().addElement('rect');
    getState().addElement('ellipse');
    getState().addElement('text');
  });

  it('moves an element to the back and to the front', () => {
    const [first, , third] = getState().project.pages[0].elements;

    getState().reorderElement(third.id, 'back');
    expect(getState().project.pages[0].elements[0].id).toBe(third.id);

    getState().reorderElement(first.id, 'front');
    expect(getState().project.pages[0].elements.at(-1).id).toBe(first.id);
  });
});

describe('alignElement', () => {
  beforeEach(() => {
    getState().newProjectFromTemplate('blank');
    getState().addElement('rect');
  });

  it('aligns an element relative to the US Letter page (816x1056)', () => {
    const id = getState().project.pages[0].elements[0].id;
    getState().updateElement(id, { width: 200, height: 100 });

    getState().alignElement(id, 'center-h');
    expect(getState().project.pages[0].elements[0].x).toBe((816 - 200) / 2);

    getState().alignElement(id, 'right');
    expect(getState().project.pages[0].elements[0].x).toBe(816 - 200);

    getState().alignElement(id, 'bottom');
    expect(getState().project.pages[0].elements[0].y).toBe(1056 - 100);
  });
});
