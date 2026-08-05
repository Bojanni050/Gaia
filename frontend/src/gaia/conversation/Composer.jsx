import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

/**
 * Composer — the always-ready place to think with Gaia.
 * Enter sends; Shift+Enter for a newline.
 *
 * The composer reports draft state to its parent so the orb can shift from
 * "quiet" to "listening" the moment the user begins to type.
 */
export default function Composer({ onSend, onStop, streaming, onDraftChange }) {
  const [text, setText] = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (onDraftChange) onDraftChange(text.trim().length > 0);
  }, [text, onDraftChange]);

  const grow = (el) => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 220)}px`; };

  const submit = () => {
    const t = text.trim();
    if (!t || streaming) return;
    onSend(t);
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={taRef}
          className="composer-input"
          placeholder="Say anything, or just think out loud…"
          value={text}
          onChange={(e) => { setText(e.target.value); grow(e.target); }}
          onKeyDown={onKey}
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
            disabled={!text.trim()}
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
