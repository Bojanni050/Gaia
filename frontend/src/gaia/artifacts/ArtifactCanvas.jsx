import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Pencil } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Markdown from '../conversation/Markdown';
import { fileUrl } from '../lib/api';
import { L } from '../lib/lexicon';

/**
 * Artifact canvas — a dynamic companion surface. Appears only when there is
 * something meaningful to show; the conversation always remains primary.
 * Now editable: Gaia and the user can shape a piece together.
 */
export default function ArtifactCanvas({ artifact, onClose, onEdit }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => { setEditing(false); setDraft(artifact ? artifact.content : ''); }, [artifact]);

  if (!artifact) return null;
  const { meta, content, messageId, ordinal } = artifact;
  const editable = meta.type !== 'image' && messageId && messageId !== 'streaming';

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const save = () => {
    if (draft !== content) onEdit(messageId, ordinal ?? 0, draft);
    setEditing(false);
  };

  let body;
  if (editing) {
    body = (
      <textarea
        className="canvas-edit-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        data-testid="canvas-edit-input"
        autoFocus
        spellCheck={false}
      />
    );
  } else if (meta.type === 'code') {
    body = (
      <SyntaxHighlighter
        language={meta.language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.85rem', padding: '20px 22px' }}
        showLineNumbers
      >
        {content}
      </SyntaxHighlighter>
    );
  } else if (meta.type === 'image') {
    body = <img className="canvas-image" src={fileUrl(content.trim())} alt={meta.title} />;
  } else {
    body = <div className="canvas-prose"><Markdown>{content}</Markdown></div>;
  }

  return (
    <aside className="canvas" data-testid="artifact-canvas">
      <header className="canvas-header">
        <div className="canvas-title-group">
          <span className="canvas-kind">{meta.type}{meta.language ? ` · ${meta.language}` : ''}</span>
          <h3 className="canvas-title">{meta.title || 'Artifact'}</h3>
        </div>
        <div className="canvas-actions">
          {editable && !editing && (
            <button className="canvas-btn" onClick={() => setEditing(true)} data-testid="canvas-edit-btn" title={L.shape}>
              <Pencil size={15} />
            </button>
          )}
          <button className="canvas-btn" onClick={copy} data-testid="canvas-copy-btn" aria-label="Copy artifact">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button className="canvas-btn" onClick={onClose} data-testid="canvas-close-btn" aria-label="Close canvas">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="canvas-body">{body}</div>
      {editing && (
        <footer className="canvas-foot">
          <button className="ghost-btn" onClick={() => { setEditing(false); setDraft(content); }} data-testid="canvas-cancel-btn">{L.discard}</button>
          <button className="accent-btn" onClick={save} data-testid="canvas-save-btn"><Check size={14} /> {L.saveShape}</button>
        </footer>
      )}
    </aside>
  );
}
