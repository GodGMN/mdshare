import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import mark from 'markdown-it-mark';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '_')
    .replace(/[^\w\u00C0-\uFFFF-]/g, '')
    .replace(/_+/g, '_');

md.use(anchor, { slugify, permalink: false });
md.use(footnote);
md.use(taskLists);
md.use(sub);
md.use(sup);
md.use(mark);

/**
 * Coerce a YAML scalar value (trimmed of any trailing comment) into a
 * JS primitive. Supports quoted strings, booleans, numbers and null.
 */
function coerceYamlValue(v) {
  if (v === '' || v === 'null' || v === '~') return null;
  if (
    (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') ||
    (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'")
  ) {
    let inner = v.slice(1, -1);
    if (v[0] === '"') {
      inner = inner
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
    }
    return inner;
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/**
 * Strip an inline `# comment` from a YAML value, respecting quotes.
 * A bare `#` at the start means the whole line was a comment.
 */
function stripYamlComment(v) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(v[i - 1]))) {
      return v.slice(0, i).trimEnd();
    }
  }
  return v.trim();
}

/**
 * Parse a ``---`` delimited YAML front-matter block into a flat scalar map.
 * Only simple `key: value` lines are supported; anything richer is kept as
 * its raw string. Returns `{ meta, body }` where `meta` is `null` when there
 * is no (or malformed) front-matter and `body` is the remaining Markdown.
 */
export function parseFrontmatter(text) {
  if (typeof text !== 'string') return { meta: null, body: '' };
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { meta: null, body: text };

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '---' || t === '...') {
      end = i;
      break;
    }
  }
  if (end === -1) return { meta: null, body: text }; // unclosed block → treat as body

  const fmLines = lines.slice(1, end);
  const bodyLines = lines.slice(end + 1);

  const meta = {};
  for (const line of fmLines) {
    if (!line.includes(':')) continue;
    const idx = line.indexOf(':');
    const key = line.slice(0, idx).trim();
    if (!key || meta[key] !== undefined) continue;
    meta[key] = coerceYamlValue(stripYamlComment(line.slice(idx + 1).trim()));
  }

  return { meta: Object.keys(meta).length ? meta : null, body: bodyLines.join('\n') };
}

export function renderMarkdown(text) {
  const { body } = parseFrontmatter(text);
  return DOMPurify.sanitize(md.render(body || ''));
}

/** Stringify a parsed front-matter value for display. */
export function formatMetaValue(v) {
  if (v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
