import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Markdown from './Markdown';
import { parseSegments } from '../lib/artifactParser';

function Attachments({ items }) {
  if (!items || !items.length) return null;
  return null;
}

function AssistantBody({ content }) {
  const segments = parseSegments(content);
  return (
    <>
      {segments.map((seg, i) => (
        <Markdown key={i}>{seg.kind === 'text' ? seg.value : (seg.value || '')}</Markdown>
      ))}
    </>
  );
}

export default function MessageView({ message, streaming }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`} data-testid={`message-${message.role}`}>
      <div className="msg-inner">
        {!isUser && <div className="msg-author">Gaia</div>}
        <div className="msg-body">
          {isUser
            ? <p className="user-text">{message.content}</p>
            : <AssistantBody content={message.content} />}
          <Attachments items={message.attachments} />
        </div>

        {!streaming && message.content && (
          <div className="msg-actions">
            <button className="msg-action" onClick={copy} data-testid="message-copy-btn" aria-label="Copy">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
