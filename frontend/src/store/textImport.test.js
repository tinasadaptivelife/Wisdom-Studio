import { beforeEach, describe, it, expect } from 'vitest';
import { useDesignStore } from './useDesignStore.js';

const getState = () => useDesignStore.getState();

beforeEach(() => {
  getState().closeProject();
});

describe('newProjectFromImportedText', () => {
  it('builds a single storybook page when the text easily fits', () => {
    getState().newProjectFromImportedText({ text: 'Once upon a time, a fox found a book.', templateKey: 'storybook' });

    const { project } = getState();
    expect(project).toBeTruthy();
    expect(project.templateKey).toBe('storybook');
    expect(project.pages).toHaveLength(1);

    const page = project.pages[0];
    const storyText = page.elements.find((el) => el.name === 'Story text');
    const image = page.elements.find((el) => el.name === 'Story illustration');
    expect(storyText.text).toBe('Once upon a time, a fox found a book.');
    expect(image).toBeTruthy();
    expect(image.prompt).toBeUndefined();
  });

  it('splits long text across multiple storybook pages, each with its own image placeholder', () => {
    const longText = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} keeps the story going.`).join(' ');
    getState().newProjectFromImportedText({ text: longText, templateKey: 'storybook' });

    const { project } = getState();
    expect(project.pages.length).toBeGreaterThan(1);
    for (const page of project.pages) {
      expect(page.elements.find((el) => el.name === 'Story text')).toBeTruthy();
      expect(page.elements.find((el) => el.name === 'Story illustration')).toBeTruthy();
    }

    // Reassembling every page's text should reproduce every sentence, in order,
    // once whitespace introduced by line-wrapping is collapsed.
    const reassembled = project.pages
      .map((p) => p.elements.find((el) => el.name === 'Story text').text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(reassembled).toBe(longText.replace(/\s+/g, ' ').trim());
  });

  it('flows into the flyer "Details" element when templateKey is flyer', () => {
    getState().newProjectFromImportedText({ text: 'Join us Saturday at noon.', templateKey: 'flyer' });

    const { project } = getState();
    expect(project.templateKey).toBe('flyer');
    const details = project.pages[0].elements.find((el) => el.name === 'Details');
    expect(details.text).toBe('Join us Saturday at noon.');
  });

  it('defaults to the storybook template for an unsupported templateKey', () => {
    getState().newProjectFromImportedText({ text: 'Hello.', templateKey: 'coloring-page' });
    expect(getState().project.templateKey).toBe('storybook');
  });

  it('still produces one page with empty text for empty/whitespace-only input', () => {
    getState().newProjectFromImportedText({ text: '   ', templateKey: 'storybook' });
    const { project } = getState();
    expect(project.pages).toHaveLength(1);
    expect(project.pages[0].elements.find((el) => el.name === 'Story text').text).toBe('');
  });

  it('names the project from the provided name, falling back to a default', () => {
    getState().newProjectFromImportedText({ text: 'Hello.', templateKey: 'storybook', name: 'My Imported Story' });
    expect(getState().project.name).toBe('My Imported Story');

    getState().closeProject();
    getState().newProjectFromImportedText({ text: 'Hello.', templateKey: 'storybook' });
    expect(getState().project.name).toMatch(/imported/i);
  });
});
