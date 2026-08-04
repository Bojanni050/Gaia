import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Threads from './sidebar/Threads';
import Conversation from './conversation/Conversation';
import ArtifactCanvas from './artifacts/ArtifactCanvas';
import { useConversation } from './state/useConversation';

export default function GaiaDesktop() {
  const g = useConversation();

  return (
    <div className={`gaia-shell${g.canvas.open ? ' with-canvas' : ''}`} data-testid="gaia-shell">
      <Threads
        conversations={g.conversations}
        activeId={g.activeId}
        onSelect={g.openConversation}
        onNew={g.newConversation}
        onDelete={g.deleteConversation}
      />

      <main className="gaia-main">
        <Conversation
          messages={g.messages}
          stream={g.stream}
          onSend={g.send}
          onStop={g.stop}
          onRetry={g.retry}
          onEdit={g.editUser}
          onOpenArtifact={g.openArtifact}
          activeArtifact={g.canvas.open ? g.canvas.artifact : null}
        />
      </main>

      <AnimatePresence>
        {g.canvas.open && (
          <motion.div
            className="canvas-slot"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 460, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <ArtifactCanvas artifact={g.canvas.artifact} onClose={g.closeCanvas} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
