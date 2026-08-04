import React, { useState } from 'react';
import { RotateCcw, Pencil, Copy, Check, X, FileText } from 'lucide-react';
import Markdown from './Markdown';
import ToolCard from './ToolCard';
import ArtifactCard from './ArtifactCard';
import { parseSegments } from '../lib/artifactParser';
import { fileUrl } from '../lib/api';

function Attachments({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="msg-attachments">
      {items.map((a) => (
        a.is_image
          ? <img key={a.id} className="msg-image" src={fileUrl(a.url)} alt={a.name} data-testid="msg-image" />
          : <span key={a.id} className="msg-file" data-testid="msg-file"><FileText size={14} /> {a.name}</span>
      ))}
    </div>
  );
}

function AssistantBody({ content, tools, onOpenArtifact, activeArtifact }) {
  const segments = parseSegments(content);
  return (
    <>
      {tools && tools.length > 0 && (
        <div className="tool-stack">{tools.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
      )}
      {segments.map((seg, i) => (
        seg.kind === 'text'
          ? <Markdown key={i}>{seg.value}</Markdown>
          : <ArtifactCard key={i} segment={seg} onOpen={onOpenArtifact}
              active={activeArtifact && activeArtifact.meta.title === seg.meta.title} />
      ))}
    </>
  );
}

export default function MessageView({ message, tools, streaming, onRetry, onEdit, onOpenArtifact, activeArtifact }) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const saveEdit = () => {
    const t = draft.trim();
    if (t && t !== message.content) onEdit(message.id, t);
    setEditing(false);
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`} data-testid={`message-${message.role}`}>
      <div className="msg-inner">
        {!isUser && <div className="msg-author">Gaia</div>}
        {isUser && editing ? (
          <div className="msg-edit">
            <textarea
              className="msg-edit-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              data-testid="message-edit-input"
              autoFocus
            />
            <div className="msg-edit-actions">
              <button className="ghost-btn" onClick={() => { setEditing(false); setDraft(message.content); }} data-testid="edit-cancel-btn"><X size={14} /> Cancel</button>
              <button className="accent-btn" onClick={saveEdit} data-testid="edit-save-btn"><Check size={14} /> Save & resend</button>
            </div>
          </div>
        ) : (
          <div className="msg-body">
            {isUser
              ? <p className="user-text">{message.content}</p>
              : <AssistantBody content={message.content} tools={tools} onOpenArtifact={onOpenArtifact} activeArtifact={activeArtifact} />}
            <Attachments items={message.attachments} />
          </div>
        )}

        {!streaming && !editing && (
          <div className="msg-actions">
            <button className="msg-action" onClick={copy} data-testid="message-copy-btn" title="Copy">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {isUser && (
              <button className="msg-action" onClick={() => setEditing(true)} data-testid="message-edit-btn" title="Edit & resend">
                <Pencil size={13} />
              </button>
            )}
            {!isUser && (
              <button className="msg-action" onClick={() => onRetry(message.id)} data-testid="message-retry-btn" title="Ask again">
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
