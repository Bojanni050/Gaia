import React from 'react';
import { FileText, Code2, Table, GitBranch, Clock, Network, StickyNote, FileImage } from 'lucide-react';

const ICONS = {
  code: Code2, document: FileText, markdown: FileText, table: Table,
  note: StickyNote, diagram: GitBranch, timeline: Clock, mindmap: Network, image: FileImage,
};

/**
 * Inline reference to an artifact. Opens the companion canvas when clicked.
 */
export default function ArtifactCard({ segment, onOpen, active }) {
  const Icon = ICONS[segment.meta.type] || FileText;
  const streaming = !segment.complete;
  return (
    <button
      className={`artifact-card${active ? ' active' : ''}`}
      onClick={() => onOpen(segment)}
      data-testid="artifact-card"
      data-artifact-type={segment.meta.type}
    >
      <span className="artifact-card-icon"><Icon size={17} /></span>
      <span className="artifact-card-meta">
        <span className="artifact-card-title">{segment.meta.title || 'Artifact'}</span>
        <span className="artifact-card-sub">
          {streaming ? 'Gaia is composing…' : `${segment.meta.type}${segment.meta.language ? ` · ${segment.meta.language}` : ''}`}
        </span>
      </span>
      <span className="artifact-card-open">Open</span>
    </button>
  );
}
