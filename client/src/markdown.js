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

export function renderMarkdown(text) {
  return DOMPurify.sanitize(md.render(text || ''));
}
