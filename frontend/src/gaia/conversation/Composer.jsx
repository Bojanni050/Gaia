import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, Paperclip, X, File } from 'lucide-react';
import { L } from '../lib/lexicon';

/**
 * Composer — the always-ready place to think with Gaia.
 * Enter sends; Shift+Enter for a newline.
 *
 * The composer supports multiple attachments, drag-and-drop, clipboard pasting,
 * and image previews.
 */
export default function Composer({ onSend, onStop, streaming, onDraftChange }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  
  const taRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (onDraftChange) {
      onDraftChange(text.trim().length > 0 || attachments.length > 0);
    }
  }, [text, attachments, onDraftChange]);

  const grow = (el) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const addFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const newAttachments = Array.from(filesList).map((file) => ({
      id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      file: file
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target && target.url) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const submit = () => {
    const t = text.trim();
    if ((!t && attachments.length === 0) || streaming) return;
    onSend(t, attachments);
    setText('');
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`composer-wrap ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="composer-wrap"
    >
      {dragOver && (
        <div className="drop-overlay" data-testid="drop-overlay">
          {L.dropOverlay}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachment-preview-bar" data-testid="attachment-preview-bar">
          {attachments.map((att) => {
            const isImg = att.type?.startsWith('image/');
            return (
              <div key={att.id} className="attachment-preview" data-testid="attachment-preview-item">
                {isImg ? (
                  <img src={att.url} alt={att.name} />
                ) : (
                  <div className="attachment-preview-file">
                    <File size={16} />
                    <span className="text-[10px] truncate w-full px-1">{att.name}</span>
                  </div>
                )}
                <button 
                  className="attachment-preview-remove" 
                  onClick={() => removeAttachment(att.id)}
                  aria-label="Remove attachment"
                  data-testid="attachment-remove-btn"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="composer">
        <div className="composer-tools">
          <button 
            className="composer-tool-btn" 
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach files"
            data-testid="attachment-btn"
          >
            <Paperclip size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            multiple 
            onChange={(e) => addFiles(e.target.files)}
            data-testid="file-input"
          />
        </div>

        <textarea
          ref={taRef}
          className="composer-input"
          placeholder={L.composerPlaceholder}
          value={text}
          onChange={(e) => { setText(e.target.value); grow(e.target); }}
          onKeyDown={onKey}
          onPaste={handlePaste}
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
            disabled={!text.trim() && attachments.length === 0}
            data-testid="send-btn"
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      <p className="composer-hint">{L.composerHint}</p>
    </div>
  );
}
