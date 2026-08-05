import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MessageView from './MessageView';
import Composer from './Composer';
import Presence from '../presence/Presence';
import { getGreeting } from '../lib/greeting';

const PRESENCE_WORD = { thinking: 'thinking', speaking: 'speaking', listening: 'listening', quiet: '' };

export default function Conversation({ messages, stream, health, onSend, onStop }) {
  const scrollRef = useRef(null);
  const greeting = useMemo(() => getGreeting(), []);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, stream.content]);

  const empty = messages.length === 0 && !stream.active;
  const presenceState = stream.active
    ? stream.presence
    : (hasDraft ? 'listening' : 'quiet');

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
                <Presence state="quiet" size={72} />
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
                <MessageView key={m.id} message={m} streaming={false} />
              ))}
              {stream.active && (
                <MessageView
                  message={{ id: stream.messageId || 'streaming', role: 'assistant', content: stream.content }}
                  streaming
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

      {health && health.status === 'unreachable' && (
        <div className="health-whisper" data-testid="health-whisper" role="status">
          <Presence state="quiet" size={18} />
          <span>I can&apos;t reach my reason engine right now. Take your time — I&apos;m here when you&apos;re ready to try again.</span>
        </div>
      )}

      <div className="composer-dock">
        <div className="conversation-column">
          <div className="dock-presence">
            <Presence state={presenceState} size={22} />
          </div>
          <Composer
            onSend={onSend}
            onStop={onStop}
            streaming={stream.active}
            onDraftChange={setHasDraft}
          />
        </div>
      </div>
    </section>
  );
}
