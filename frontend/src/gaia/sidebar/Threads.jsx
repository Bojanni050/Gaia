import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { L } from '../lib/lexicon';

export default function Threads({ 
  conversations, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete, 
  lang = 'nl', 
  onLangChange 
}) {
  return (
    <nav className="sidebar" data-testid="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">Gaia</span>
      </div>

      <button className="new-thread-btn" onClick={onNew} data-testid="new-conversation-btn">
        <Plus size={16} /> {L.newPage}
      </button>

      <div className="thread-list" data-testid="thread-list">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`thread-item${c.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(c.id)}
            data-testid="thread-item"
          >
            <span className="thread-title">{c.title || L.untitled}</span>
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
        <div className="lang-switcher" data-testid="lang-switcher">
          <button 
            className={`lang-btn ${lang === 'nl' ? 'active' : ''}`}
            onClick={() => onLangChange('nl')}
            data-testid="lang-btn-nl"
          >
            NL
          </button>
          <span className="lang-separator">/</span>
          <button 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => onLangChange('en')}
            data-testid="lang-btn-en"
          >
            EN
          </button>
        </div>
        <span className="foot-line">{L.footLine1}</span>
        <span className="foot-line">{L.footLine2}</span>
      </div>
    </nav>
  );
}
