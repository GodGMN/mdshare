import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown.js';

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
