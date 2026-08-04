import React from 'react';
import { Calculator, Clock, Loader2, Check } from 'lucide-react';

const ICONS = { calculate: Calculator, get_current_time: Clock };
const LABELS = { calculate: 'Calculating', get_current_time: 'Checking the time' };

/**
 * Tool card — surfaces an MCP action as intent + result, never as tool-chain plumbing.
 */
export default function ToolCard({ tool }) {
  const Icon = ICONS[tool.name] || Calculator;
  const running = tool.status === 'running';
  const result = tool.result;
  let summary = '';
  if (result && typeof result === 'object') {
    if (result.error) summary = String(result.error);
    else if ('result' in result) summary = String(result.result);
    else if (result.readable) summary = result.readable;
    else summary = JSON.stringify(result);
  }
  return (
    <div className="tool-card" data-testid="tool-card" data-tool={tool.name} data-status={tool.status}>
      <span className="tool-icon"><Icon size={15} /></span>
      <span className="tool-name">{LABELS[tool.name] || tool.name}</span>
      <span className="tool-status">
        {running ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
      </span>
      {!running && summary && <span className="tool-result">{summary}</span>}
    </div>
  );
}
