import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Threads from './sidebar/Threads';
import Conversation from './conversation/Conversation';
import { useConversation } from './state/useConversation';

export default function GaiaDesktop() {
  const g = useConversation();
  const [lang, setLang] = useState(localStorage.getItem('gaia.lang') || 'nl');

  const handleLangChange = (newLang) => {
    localStorage.setItem('gaia.lang', newLang);
    setLang(newLang);
  };

  return (
    <motion.div
      className="gaia-shell"
      data-testid="gaia-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.0, ease: 'easeOut' }}
    >
      <Threads
        conversations={g.conversations}
        activeId={g.activeId}
        onSelect={g.openConversation}
        onNew={() => g.newConversation('')}
        onDelete={g.deleteConversation}
        lang={lang}
        onLangChange={handleLangChange}
      />

      <main className="gaia-main">
        <Conversation
          key={lang}
          messages={g.messages}
          stream={g.stream}
          health={g.health}
          onSend={g.send}
          onStop={g.stop}
          onEdit={g.editMessage}
          onDelete={g.deleteMessage}
          onRegenerate={g.regenerate}
          onRetry={g.retry}
        />
      </main>
    </motion.div>
  );
}
