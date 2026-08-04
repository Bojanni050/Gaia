import React, { useRef, useState } from 'react';
import { ArrowUp, Paperclip, Square, X, FileText } from 'lucide-react';

/**
 * Composer — the always-ready place to think with Gaia.
 * Enter sends; Shift+Enter for a newline. Uploads persist to object storage.
 */
export default function Composer({ onSend, onStop, streaming, onFocusChange }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  const grow = (el) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; };

  const submit = () => {
    const t = text.trim();
    if ((!t && files.length === 0) || streaming) return;
    onSend(t, files);
    setText('');
    setFiles([]);
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const addFiles = (list) => setFiles((f) => [...f, ...Array.from(list)]);

  return (
    <div className="composer-wrap">
      {files.length > 0 && (
        <div className="composer-chips" data-testid="composer-chips">
          {files.map((f, i) => (
            <span key={i} className="attach-chip">
              <FileText size={13} /> {f.name}
              <button onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="Remove" data-testid="remove-attachment-btn"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="composer">
        <button
          className="composer-attach"
          onClick={() => fileRef.current?.click()}
          data-testid="attach-btn"
          aria-label="Attach a file"
          disabled={streaming}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,.txt,.md,.csv,.json"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          data-testid="file-input"
        />
        <textarea
          ref={taRef}
          className="composer-input"
          placeholder="Say anything, or just think out loud…"
          value={text}
          onChange={(e) => { setText(e.target.value); grow(e.target); }}
          onKeyDown={onKey}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          rows={1}
          data-testid="composer-input"
        />
        {streaming ? (
          <button className="composer-send stop" onClick={onStop} data-testid="stop-btn" aria-label="Stop">
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            className="composer-send"
            onClick={submit}
            disabled={!text.trim() && files.length === 0}
            data-testid="send-btn"
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      <p className="composer-hint">Gaia keeps what matters, and stays quiet when nothing needs saying.</p>
    </div>
  );
}
