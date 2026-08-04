import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MessageView from './MessageView';
import Composer from './Composer';
import Presence from '../presence/Presence';
import { getGreeting } from '../lib/greeting';

const PRESENCE_WORD = { thinking: 'thinking', speaking: 'speaking', listening: 'listening', resting: '' };

export default function Conversation({
  messages, stream, onSend, onStop, onRetry, onEdit, onOpenArtifact, activeArtifact,
}) {
  const scrollRef = useRef(null);
  const [inputFocused, setInputFocused] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, stream.content, stream.tools]);

  const empty = messages.length === 0 && !stream.active;
  const presenceState = stream.active ? stream.presence : (inputFocused ? 'listening' : 'resting');

  return (
    <section className="conversation" data-testid="conversation">
      <div className="conversation-scroll" ref={scrollRef}>
        <div className="conversation-column">
          {empty ? (
            <div className="welcome" data-testid="welcome">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              >
                <Presence state={inputFocused ? 'listening' : 'resting'} size={72} />
              </motion.div>
              <motion.h1
                className="welcome-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 0.7, ease: 'easeOut' }}
              >
                {greeting.title}
              </motion.h1>
              <motion.p
                className="welcome-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 1.15, ease: 'easeOut' }}
              >
                {greeting.sub}
              </motion.p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <MessageView
                  key={m.id}
                  message={m}
                  tools={m.tool_calls}
                  streaming={false}
                  onRetry={onRetry}
                  onEdit={onEdit}
                  onOpenArtifact={onOpenArtifact}
                  activeArtifact={activeArtifact}
                />
              ))}
              {stream.active && (
                <MessageView
                  message={{ id: 'streaming', role: 'assistant', content: stream.content, attachments: [] }}
                  tools={stream.tools}
                  streaming
                  onRetry={onRetry}
                  onEdit={onEdit}
                  onOpenArtifact={onOpenArtifact}
                  activeArtifact={activeArtifact}
                />
              )}
              {stream.active && !stream.content && (
                <div className="thinking-row" data-testid="thinking-indicator">
                  <Presence state={stream.presence} size={26} />
                  <span className="thinking-word">{PRESENCE_WORD[stream.presence] || 'thinking'}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="composer-dock">
        <div className="conversation-column">
          <div className="dock-presence">
            <Presence state={presenceState} size={22} />
          </div>
          <Composer
            onSend={onSend}
            onStop={onStop}
            streaming={stream.active}
            onFocusChange={setInputFocused}
          />
        </div>
      </div>
    </section>
  );
}
