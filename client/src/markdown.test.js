import { describe, it, expect } from 'vitest';
import { renderMarkdown, parseFrontmatter, formatMetaValue } from './markdown.js';

describe('renderMarkdown', () => {
  it('renders headings with slug ids', () => {
    const html = renderMarkdown('# Hello World');
    expect(html).toMatch(/<h1 id="hello_world"[^>]*>/);
  });

  it('renders links with safe hrefs', () => {
    const html = renderMarkdown('[site](https://example.com)');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders footnotes, task lists, sub, sup and mark', () => {
    expect(renderMarkdown('H~2~O')).toContain('<sub>2</sub>');
    expect(renderMarkdown('x^2^')).toContain('<sup>2</sup>');
    expect(renderMarkdown('==highlighted==')).toContain('<mark>highlighted</mark>');
    expect(renderMarkdown('- [ ] todo')).toContain('type="checkbox"');
    expect(renderMarkdown('text[^1]\n\n[^1]: note')).toContain('footnote');
  });

  it('renders empty input as empty output', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
  });

  it('does not execute raw HTML (html disabled)', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toMatch(/<script>/i);
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes raw HTML instead of rendering it', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain('&lt;img');
  });

  it('neutralizes javascript: URLs by not creating a link', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toMatch(/<a[^>]+javascript:/i);
    expect(html).not.toMatch(/<a\s/i);
  });

  it('strips dangerous content even if injected through linkify', () => {
    const html = renderMarkdown('visit javascript:alert(1) now');
    expect(html).not.toMatch(/href="javascript:/i);
  });
});

describe('parseFrontmatter', () => {
  const src = `---
title: "Standalone YouTube Downloader — PRD"
type: proposal
status: draft
owner: product
updated: 2026-08-27
---

# PRD — Standalone YouTube Downloader`;

  it('parses scalar front-matter and separates the body', () => {
    const { meta, body } = parseFrontmatter(src);
    expect(meta).toEqual({
      title: 'Standalone YouTube Downloader — PRD',
      type: 'proposal',
      status: 'draft',
      owner: 'product',
      updated: '2026-08-27',
    });
    expect(body).toContain('# PRD — Standalone YouTube Downloader');
    expect(body).not.toContain('---');
    expect(body).not.toContain('proposal');
  });

  it('coerces booleans, numbers and null', () => {
    const { meta } = parseFrontmatter('---\nok: true\nno: false\ncount: 42\nnil:\n---');
    expect(meta).toEqual({ ok: true, no: false, count: 42, nil: null });
  });

  it('drops inline comments and honours quoting', () => {
    const { meta } = parseFrontmatter(
      "---\nnote: 'has # not a comment'\nstatus: live # trailing\n---",
    );
    expect(meta).toEqual({ note: 'has # not a comment', status: 'live' });
  });

  it('returns null meta when there is no front-matter', () => {
    const { meta, body } = parseFrontmatter('# Just a heading');
    expect(meta).toBeNull();
    expect(body).toBe('# Just a heading');
  });

  it('treats an unclosed front-matter as body', () => {
    const { meta, body } = parseFrontmatter('---\ntitle: x\n# never closes');
    expect(meta).toBeNull();
    expect(body).toBe('---\ntitle: x\n# never closes');
  });

  it('handles non-string input', () => {
    expect(parseFrontmatter(null)).toEqual({ meta: null, body: '' });
  });
});

describe('renderMarkdown with front-matter', () => {
  it('hides the front-matter block from the rendered output', () => {
    const html = renderMarkdown(`---
title: "A"
status: draft
---
# Hello
`);
    expect(html).toContain('<h1');
    expect(html).not.toContain('draft');
    expect(html).not.toMatch(/<hr/);
  });
});

describe('formatMetaValue', () => {
  it('formats values for display', () => {
    expect(formatMetaValue('x')).toBe('x');
    expect(formatMetaValue(false)).toBe('false');
    expect(formatMetaValue(null)).toBe('');
    expect(formatMetaValue({ a: 1 })).toBe('{"a":1}');
  });
});
