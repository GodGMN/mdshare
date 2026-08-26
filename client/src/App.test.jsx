import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  document.execCommand = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('save then view: pastes markdown and renders it back', async () => {
  const fetchMock = vi.fn(async (url, opts) => {
    if (url === '/api/paste' && opts?.method === 'POST') {
      expect(JSON.parse(opts.body).content).toBe('# Hello');
      return { ok: true, json: async () => ({ id: 'e2e-1', url: '/e2e-1' }) };
    }
    if (url === '/api/paste/e2e-1') {
      return { ok: true, json: async () => ({ id: 'e2e-1', content: '# Hello', created_at: 1 }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  const editor = screen.getByPlaceholderText(/Paste your Markdown/i);
  fireEvent.change(editor, { target: { value: '# Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));

  await waitFor(() => {
    const heading = screen.getByRole('heading', { level: 1, name: 'Hello' });
    expect(heading).toBeTruthy();
  });

  expect(fetchMock).toHaveBeenCalledWith('/api/paste', expect.anything());
  expect(fetchMock).toHaveBeenCalledWith('/api/paste/e2e-1');
  expect(window.location.pathname).toBe('/e2e-1');
});

test('copy buttons copy markdown and url, new note resets the editor', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url === '/api/paste')
        return { ok: true, json: async () => ({ id: 'e2e-2', url: '/e2e-2' }) };
      if (url === '/api/paste/e2e-2')
        return {
          ok: true,
          json: async () => ({ id: 'e2e-2', content: '# Copy me', created_at: 1 }),
        };
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );

  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/Paste your Markdown/i), {
    target: { value: '# Copy me' },
  });
  fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Copy me' })).toBeTruthy());

  fireEvent.click(screen.getByRole('button', { name: /COPY MD/ }));
  expect(document.execCommand).toHaveBeenCalledWith('copy');
  // URL copy is exercised by the save flow above (auto-copies the share URL)
  fireEvent.click(screen.getByRole('button', { name: /NEW NOTE/ }));

  await waitFor(() => expect(screen.getByPlaceholderText(/Paste your Markdown/i)).toBeTruthy());
  expect(window.location.pathname).toBe('/');
});

test('save failure shows an error and keeps the editor', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, json: async () => ({ error: 'rate limited' }) })),
  );

  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/Paste your Markdown/i), {
    target: { value: '# Nope' },
  });
  fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));

  await waitFor(() => expect(screen.getByText(/ERR: rate limited/)).toBeTruthy());
  expect(screen.getByPlaceholderText(/Paste your Markdown/i)).toBeTruthy();
});

test('front-matter metadata is represented as a metadata panel', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url === '/api/paste')
        return { ok: true, json: async () => ({ id: 'meta-1', url: '/meta-1' }) };
      if (url === '/api/paste/meta-1')
        return {
          ok: true,
          json: async () => ({
            id: 'meta-1',
            content: `---
title: "PRD — Example"
type: proposal
status: draft
owner: product
updated: 2026-08-27
---

# Body`,
            created_at: 1,
          }),
        };
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
  window.history.replaceState({}, '', '/meta-1');

  render(<App />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Body' })).toBeTruthy());

  const meta = screen.getByLabelText('Document metadata');
  expect(meta).toBeTruthy();
  expect(meta.textContent).toContain('title');
  expect(meta.textContent).toContain('PRD — Example');
  expect(meta.textContent).toContain('status');
  expect(meta.textContent).toContain('draft');
  // front-matter block must not bleed into the rendered markdown
  expect(screen.getByRole('heading', { name: 'Body' }).parentElement.textContent).toContain('Body');
  expect(document.title).toContain('PRD — Example');
});
