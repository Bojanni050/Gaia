import React, { useState } from 'react';
import { Copy, Check, Edit3, Trash2, RotateCw, File, Image } from 'lucide-react';
import Markdown from './Markdown';
import { parseSegments } from '../lib/artifactParser';

function Attachments({ items }) {
  if (!items || !items.length) return null;

  return (
    <div className="message-attachments" data-testid="message-attachments">
      {items.map((item) => {
        const isImg = item.type?.startsWith('image/');
        if (isImg) {
          return (
            <img
              key={item.id}
              src={item.url}
              alt={item.name}
              className="message-attachment-image"
              onClick={() => window.open(item.url, '_blank')}
              data-testid="attachment-image"
            />
          );
        }

        return (
          <a
            key={item.id}
            href={item.url}
            download={item.name}
            className="message-attachment-card"
            data-testid="attachment-file"
          >
            <File size={16} />
            <span>{item.name}</span>
          </a>
        );
      })}
    </div>
  );
}

function AssistantBody({ content, streaming }) {
  const segments = parseSegments(content);
  return (
    <>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const val = seg.kind === 'text' ? seg.value : (seg.value || '');
        if (isLast && streaming) {
          return (
            <React.Fragment key={i}>
              <Markdown>{val}</Markdown>
              <span className="streaming-cursor" data-testid="streaming-cursor" />
            </React.Fragment>
          );
        }
        return (
          <Markdown key={i}>{val}</Markdown>
        );
      })}
    </>
  );
}

export default function MessageView({ message, streaming, onEdit, onDelete, onRegenerate, onRetry }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit(message.id, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`} data-testid={`message-${message.role}`}>
      <div className="msg-inner">
        {!isUser && <div className="msg-author">Gaia</div>}
        <div className="msg-body">
          {isUser ? (
            isEditing ? (
              <div className="edit-textarea-wrap" data-testid="edit-textarea-wrap">
                <textarea
                  className="edit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  data-testid="edit-textarea"
                />
                <div className="edit-actions">
                  <button className="edit-btn cancel" onClick={handleCancelEdit} data-testid="edit-cancel-btn">
                    Cancel
                  </button>
                  <button className="edit-btn save" onClick={handleSaveEdit} data-testid="edit-save-btn">
                    Save & Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <p className="user-text" data-testid="user-text">{message.content}</p>
            )
          ) : (
            <AssistantBody content={message.content} streaming={streaming} />
          )}
          <Attachments items={message.attachments} />
        </div>

        {!streaming && !isEditing && (
          <div className="msg-actions" data-testid="message-actions">
            {message.content && (
              <button className="msg-action" onClick={copy} data-testid="message-copy-btn" aria-label="Copy">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            )}
            {isUser ? (
              <>
                <button className="msg-action" onClick={() => setIsEditing(true)} data-testid="message-edit-btn" aria-label="Edit">
                  <Edit3 size={13} />
                </button>
                <button className="msg-action" onClick={() => onDelete(message.id)} data-testid="message-delete-btn" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              <>
                {message.error ? (
                  <button className="msg-action" onClick={() => onRetry(message.id)} data-testid="message-retry-btn" aria-label="Retry">
                    <RotateCw size={13} />
                    <span>Retry</span>
                  </button>
                ) : (
                  <button className="msg-action" onClick={() => onRegenerate(message.id)} data-testid="message-regenerate-btn" aria-label="Regenerate">
                    <RotateCw size={13} />
                  </button>
                )}
                <button className="msg-action" onClick={() => onDelete(message.id)} data-testid="message-delete-btn" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
