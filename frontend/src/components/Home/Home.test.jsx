import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import Home from './Home.jsx';
import { useDesignStore } from '../../store/useDesignStore.js';

vi.mock('../../utils/textImport.js', () => ({ readImportedFile: vi.fn() }));
import { readImportedFile } from '../../utils/textImport.js';

beforeEach(() => {
  useDesignStore.getState().closeProject();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Home', () => {
  it('renders all twelve asset type cards', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /start a new blank canvas project/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse coloring page templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse flyer templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse storybook page templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse quote card templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse document templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse newsletter templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse workbook templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse certificate templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse social media post templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse invitation templates/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /browse brochure templates/i })).toBeTruthy();
  });

  it('loads a project from a single-variant template type on click', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /start a new blank canvas project/i }));
    expect(useDesignStore.getState().project?.templateKey).toBe('blank');
  });

  it('opens a variant gallery of 6 earth-tone flyer options instead of starting a project', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /browse flyer templates/i }));

    expect(useDesignStore.getState().project).toBeNull();
    expect(screen.getByRole('button', { name: /cream & terracotta flyer/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sage & cream flyer/i })).toBeTruthy();
  });

  it('creates a project from the chosen variant in the gallery', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /browse flyer templates/i }));
    fireEvent.click(screen.getByRole('button', { name: /sage & cream flyer/i }));

    expect(useDesignStore.getState().project?.templateKey).toBe('flyer-sage-cream');
  });

  it('returns to the type grid via the back button without creating a project', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /browse flyer templates/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to templates/i }));

    expect(useDesignStore.getState().project).toBeNull();
    expect(screen.getByRole('button', { name: /browse flyer templates/i })).toBeTruthy();
  });

  it('shows a friendly error if the backend project list cannot be reached', async () => {
    fetch.mockRejectedValueOnce(new Error('fetch failed'));
    render(<Home />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t reach the local server/i);
  });
});

describe('Home import section', () => {
  it('imports a text file into a new project using the chosen template', async () => {
    readImportedFile.mockResolvedValueOnce('Once upon a time...');
    render(<Home />);

    const file = new File(['Once upon a time...'], 'story.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/choose a file to import/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(useDesignStore.getState().project).toBeTruthy());
    expect(readImportedFile).toHaveBeenCalledWith(file);
    expect(useDesignStore.getState().project.templateKey).toBe('storybook');
    const storyText = useDesignStore
      .getState()
      .project.pages[0].elements.find((el) => el.name === 'Story text');
    expect(storyText.text).toBe('Once upon a time...');
  });

  it('respects the flyer template choice', async () => {
    readImportedFile.mockResolvedValueOnce('Join us Saturday.');
    render(<Home />);

    fireEvent.change(screen.getByLabelText(/template for imported text/i), { target: { value: 'flyer' } });
    const file = new File(['Join us Saturday.'], 'flyer.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/choose a file to import/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(useDesignStore.getState().project?.templateKey).toBe('flyer'));
  });

  it('disables the import button until a file is chosen', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /^import$/i })).toBeDisabled();
  });

  it('shows a friendly error when the file cannot be read', async () => {
    readImportedFile.mockRejectedValueOnce(new Error('Unsupported file type.'));
    render(<Home />);

    const file = new File(['%PDF'], 'story.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/choose a file to import/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/unsupported file type/i)).toBeTruthy();
  });
});

const projectSummary = (overrides = {}) => ({
  id: 'proj_1',
  name: 'My Flyer',
  pageSize: 'letter',
  templateKey: 'flyer',
  pageCount: 1,
  updatedAt: '2026-07-11T00:00:00.000Z',
  ...overrides,
});

describe('Home saved projects', () => {
  it('renders a thumbnail image when the project has one', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [projectSummary({ thumbnail: 'data:image/jpeg;base64,AAAA' })],
    });
    render(<Home />);
    const img = await screen.findByRole('img', { name: /my flyer/i });
    expect(img.src).toContain('data:image/jpeg;base64,AAAA');
  });

  it('shows a placeholder (no broken image) when a project has no thumbnail', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [projectSummary()] });
    render(<Home />);
    await screen.findByText('My Flyer');
    expect(screen.queryByRole('img', { name: /my flyer/i })).toBeNull();
  });

  it('renames a saved project via the backend', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [projectSummary()] });
    render(<Home />);
    await screen.findByText('My Flyer');

    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'proj_1', name: 'My Flyer', pages: [] }) });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    fireEvent.click(screen.getByRole('button', { name: /rename my flyer/i }));
    const input = screen.getByRole('textbox', { name: /new name/i });
    fireEvent.change(input, { target: { value: 'Summer Flyer' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const putCall = fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(JSON.parse(putCall[1].body).name).toBe('Summer Flyer');
    });
  });

  it('deletes a saved project after the user confirms', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [projectSummary()] });
    render(<Home />);
    await screen.findByText('My Flyer');

    fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    fireEvent.click(screen.getByRole('button', { name: /delete my flyer/i }));

    await waitFor(() => expect(screen.queryByText('My Flyer')).toBeNull());
  });

  it('keeps the project when the user cancels the delete confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [projectSummary()] });
    render(<Home />);
    await screen.findByText('My Flyer');

    fireEvent.click(screen.getByRole('button', { name: /delete my flyer/i }));
    expect(screen.getByText('My Flyer')).toBeTruthy();
  });
});
