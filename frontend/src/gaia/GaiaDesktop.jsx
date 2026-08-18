import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import Threads from './sidebar/Threads';
import Conversation from './conversation/Conversation';
import { useConversation } from './state/useConversation';
import { L } from './lib/lexicon';

export default function GaiaDesktop() {
  const g = useConversation();
  const [lang, setLang] = useState(localStorage.getItem('gaia.lang') || 'nl');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label={L.openMenu}
        data-testid="mobile-menu-btn"
      >
        <Menu size={18} />
      </button>

      <div
        className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        data-testid="sidebar-backdrop"
      />

      <Threads
        conversations={g.conversations}
        activeId={g.activeId}
        onSelect={(id) => { g.openConversation(id); setSidebarOpen(false); }}
        onNew={() => { g.newConversation(''); setSidebarOpen(false); }}
        onDelete={g.deleteConversation}
        lang={lang}
        onLangChange={handleLangChange}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
