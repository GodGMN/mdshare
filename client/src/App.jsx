import { useCallback, useEffect, useRef, useState } from 'react';
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

const idFromPath = () => {
  const seg = window.location.pathname.split('/').filter(Boolean);
  return seg.length ? seg[seg.length - 1] : null;
};

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

export default function App() {
  const initialId = useRef(idFromPath());
  const [id, setId] = useState(initialId.current);
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedAction, setCopiedAction] = useState(null);
  const copiedTimer = useRef(null);
  const taRef = useRef(null);

  const flashCopied = useCallback((action) => {
    setCopiedAction(action);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedAction(null), 1600);
  }, []);

  const save = useCallback(async () => {
    if (!content) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      setId(data.id);
      window.history.replaceState({}, '', data.url);
      await copyText(`${window.location.origin}${data.url}`);
      flashCopied('url');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [content, flashCopied]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/paste/${id}`);
        if (res.status === 404) {
          setError('Paste not found');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'load failed');
        if (!cancelled) {
          setContent(data.content);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const rendered = DOMPurify.sanitize(md.render(content || ''));

  const newNote = () => {
    setContent('');
    setId(null);
    setError(null);
    setCopiedAction(null);
    window.history.replaceState({}, '', '/');
  };

  const copy = async () => {
    if (!id) return;
    await copyText(`${window.location.origin}/${id}`);
    flashCopied('url');
  };

  const copyMarkdown = async () => {
    await copyText(content);
    flashCopied('md');
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">mdshare<span>_</span></span>
        <div className="actions">
          {id && (
            <>
              <button
                className={`btn copy${copiedAction === 'md' ? ' copied' : ''}`}
                onClick={copyMarkdown}
              >
                {copiedAction === 'md' ? '[ COPIED ]' : '[ COPY MD ]'}
              </button>
              <button
                className={`btn copy${copiedAction === 'url' ? ' copied' : ''}`}
                onClick={copy}
              >
                {copiedAction === 'url' ? '[ COPIED ]' : '[ COPY URL ]'}
              </button>
            </>
          )}
          <button className="btn" onClick={newNote}>
            [ NEW NOTE ]
          </button>
        </div>
      </header>

      {error && <div className="error">ERR: {error}</div>}

      {id ? (
        <main className="viewer">
          <div className="markdown" dangerouslySetInnerHTML={{ __html: rendered }} />
        </main>
      ) : (
        <main className="editor">
          <textarea
            ref={taRef}
            placeholder="Paste your Markdown here…  (Ctrl+S to save)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
          <div className="editor-actions">
            <span className="hint">CTRL+S to save</span>
            <button
              className="btn save"
              onClick={save}
              disabled={loading || !content}
            >
              {loading ? '[ SAVING… ]' : '[ SAVE ]'}
            </button>
          </div>
        </main>
      )}

      <footer className="footer">
        Made by <a href="https://gimeno.dev" target="_blank" rel="noopener noreferrer">Gimeno</a>
      </footer>
    </div>
  );
}
