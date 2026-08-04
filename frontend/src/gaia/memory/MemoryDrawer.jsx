import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { L, DOMAIN_LABEL } from '../lib/lexicon';

function relTime(iso) {
  try {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const d = Math.floor(diff / 86400000);
    if (d > 1) return `noticed ${d} days ago`;
    if (d === 1) return 'noticed yesterday';
    const h = Math.floor(diff / 3600000);
    if (h >= 1) return `noticed ${h}h ago`;
    return 'noticed just now';
  } catch (_) { return 'noticed recently'; }
}

const ORDER = ['patterns', 'preferences', 'context', 'relationships'];

/**
 * Quiet Memory — a calm, opt-in view of what Gaia has come to understand.
 * Reveal, don't navigate: it slides over the conversation and can be let go.
 * Understanding, never a log. Everything here is the user's to forget.
 */
export default function MemoryDrawer({ memory, onClose, onForget }) {
  const groups = {};
  (memory.reflections || []).forEach((r) => {
    (groups[r.domain] = groups[r.domain] || []).push(r);
  });
  const domains = ORDER.filter((d) => groups[d]);
  const empty = !memory.loading && (memory.reflections || []).length === 0;

  return (
    <motion.div
      className="memory-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="memory-overlay"
    >
      <div className="memory-scrim" onClick={onClose} />
      <motion.aside
        className="memory-drawer"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        data-testid="memory-drawer"
      >
        <header className="memory-header">
          <div>
            <h2 className="memory-title">{L.memoryTitle}</h2>
            <p className="memory-lede">{L.memoryLede}</p>
          </div>
          <button className="canvas-btn" onClick={onClose} data-testid="memory-close-btn" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="memory-body">
          {memory.loading && <p className="memory-status">Gathering what I understand…</p>}
          {empty && <p className="memory-empty" data-testid="memory-empty">{L.memoryEmpty}</p>}

          {domains.map((d) => (
            <section className="memory-group" key={d}>
              <h3 className="memory-group-title">{DOMAIN_LABEL[d] || d}</h3>
              {groups[d].map((r) => (
                <div className="reflection" key={r.id} data-testid="reflection-item">
                  <span className="reflection-dot" style={{ opacity: 0.3 + 0.6 * (r.confidence || 0.5) }} />
                  <div className="reflection-body">
                    <p className="reflection-summary">{r.summary}</p>
                    <div className="reflection-meta">
                      <span className="reflection-time">{relTime(r.observed_at)}</span>
                      <button className="reflection-forget" onClick={() => onForget(r.id)} data-testid="forget-btn">
                        {L.forget}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </motion.aside>
    </motion.div>
  );
}
