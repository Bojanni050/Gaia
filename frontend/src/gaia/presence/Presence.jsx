import React from 'react';
import { motion } from 'framer-motion';

/**
 * Gaia's presence — a quiet, breathing sign of life.
 * Motion communicates state (resting / listening / thinking / speaking), never decoration.
 */
const CONFIG = {
  resting: { scale: [1, 1.04, 1], opacity: [0.55, 0.7, 0.55], duration: 6, glow: 0.25 },
  listening: { scale: [1, 1.06, 1], opacity: [0.7, 0.9, 0.7], duration: 3.4, glow: 0.4 },
  thinking: { scale: [1, 1.12, 0.98, 1], opacity: [0.7, 1, 0.8, 0.7], duration: 1.8, glow: 0.6 },
  speaking: { scale: [1, 1.09, 1.02, 1.09, 1], opacity: [0.85, 1, 0.9, 1, 0.85], duration: 1.2, glow: 0.75 },
};

export default function Presence({ state = 'resting', size = 44, label }) {
  const c = CONFIG[state] || CONFIG.resting;
  return (
    <div className="presence" data-testid="gaia-presence" data-state={state} title={`Gaia — ${state}`}>
      <div className="presence-orb-wrap" style={{ width: size, height: size }}>
        <motion.span
          className="presence-halo"
          animate={{ scale: c.scale, opacity: c.glow }}
          transition={{ duration: c.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="presence-orb"
          animate={{ scale: c.scale, opacity: c.opacity }}
          transition={{ duration: c.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      {label && <span className="presence-label">{label}</span>}
    </div>
  );
}
