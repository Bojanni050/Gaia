import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PresenceOrb } from './PresenceOrb';
import { PresenceMessage } from './PresenceMessage';
import { usePresenceAnimator } from './PresenceAnimator';

/**
 * Composite Presence component.
 * 
 * Renders the visual PresenceOrb and, when actively thinking, 
 * renders a sequenced animated message that reflects the conversation context.
 * 
 * @param {boolean} isThinking - True when waiting for a response but before tokens stream.
 * @param {string} type - The conversation type (e.g. 'general', 'technical', 'personal').
 * @param {string} state - The visual state of the orb ('quiet', 'listening', 'thinking', 'speaking').
 * @param {number} size - The size of the orb.
 * @param {string} label - Optional static label (legacy support, largely unused now).
 */
export default function Presence({ isThinking = false, type = 'general', state = 'quiet', size = 44, label }) {
  const animatedMessage = usePresenceAnimator(isThinking, type);

  return (
    <div className="presence" data-testid="gaia-presence" data-state={state} title={`Gaia — ${state}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <PresenceOrb state={state} size={size} />
      
      {/* Legacy static label */}
      {label && <span className="presence-label">{label}</span>}
      
      {/* Animated contextual message when thinking */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <PresenceMessage message={animatedMessage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
