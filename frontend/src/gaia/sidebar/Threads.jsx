import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function Threads({ conversations, activeId, onSelect, onNew, onDelete }) {
  return (
    <nav className="sidebar" data-testid="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">Gaia</span>
      </div>

      <button className="new-thread-btn" onClick={onNew} data-testid="new-conversation-btn">
        <Plus size={16} /> New page
      </button>

      <div className="thread-list" data-testid="thread-list">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`thread-item${c.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(c.id)}
            data-testid="thread-item"
          >
            <span className="thread-title">{c.title || 'Untitled'}</span>
            <button
              className="thread-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              aria-label="Delete conversation"
              data-testid="delete-conversation-btn"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <span className="foot-line">A lifelong personal intelligence,</span>
        <span className="foot-line">growing through understanding.</span>
      </div>
    </nav>
  );
}
