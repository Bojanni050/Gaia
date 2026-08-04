import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Markdown from '../conversation/Markdown';
import { fileUrl } from '../lib/api';

/**
 * Artifact canvas — a dynamic companion surface. Appears only when there is
 * something meaningful to show; the conversation always remains primary.
 */
export default function ArtifactCanvas({ artifact, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!artifact) return null;
  const { meta, content } = artifact;
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  let body;
  if (meta.type === 'code') {
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
          <button className="canvas-btn" onClick={copy} data-testid="canvas-copy-btn" aria-label="Copy artifact">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button className="canvas-btn" onClick={onClose} data-testid="canvas-close-btn" aria-label="Close canvas">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="canvas-body">{body}</div>
    </aside>
  );
}
