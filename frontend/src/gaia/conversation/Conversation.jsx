import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import MessageView from './MessageView';
import Composer from './Composer';
import { Presence, PresenceOrb } from '../../components/Presence';
import { getGreeting } from '../lib/greeting';
import { L } from '../lib/lexicon';

export default function Conversation({
  messages,
  stream,
  health,
  onSend,
  onStop,
  onEdit,
  onDelete,
  onRegenerate,
  onRetry
}) {
  const scrollRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const prevLenRef = useRef(messages.length);
  
  const greeting = useMemo(() => getGreeting(), []);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Auto-scroll if a new message was added or we are locked at the bottom
    if (messages.length > prevLenRef.current || isAtBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    prevLenRef.current = messages.length;
  }, [messages, stream.content]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // User is considered at the bottom if within 80px of the absolute bottom
    const threshold = 80;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    isAtBottomRef.current = isAtBottom;
  };

  const empty = messages.length === 0 && !stream.active;
  const presenceState = stream.active
    ? stream.presence
    : (hasDraft ? 'listening' : 'quiet');

  return (
    <section className="conversation" data-testid="conversation">
      <div 
        className="conversation-scroll" 
        ref={scrollRef} 
        onScroll={handleScroll}
        data-testid="conversation-scroll"
      >
        <div className="conversation-column">
          {empty ? (
            <div className="welcome" data-testid="welcome">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              >
                <PresenceOrb state="quiet" size={72} />
              </motion.div>
              <motion.h1
                className="welcome-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 0.7, ease: 'easeOut' }}
              >
                {greeting.title}
              </motion.h1>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <MessageView 
                  key={m.id} 
                  message={m} 
                  streaming={false} 
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRegenerate={onRegenerate}
                  onRetry={onRetry}
                />
              ))}
              {stream.active && stream.content && (
                <MessageView
                  key={stream.messageId || 'streaming'}
                  message={{ id: stream.messageId || 'streaming', role: 'assistant', content: stream.content }}
                  streaming
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRegenerate={onRegenerate}
                  onRetry={onRetry}
                />
              )}
              {stream.active && !stream.content && (
                <div className="thinking-row" data-testid="thinking-indicator">
                  <Presence isThinking={true} type="general" state={stream.presence} size={26} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {health && health.status === 'unreachable' && (
        <div className="health-whisper" data-testid="health-whisper" role="status">
          <PresenceOrb state="quiet" size={18} />
          <span>{L.healthWhisper}</span>
        </div>
      )}

      <div className="composer-dock">
        <div className="conversation-column">
          <div className="dock-presence">
            <PresenceOrb state={presenceState} size={22} />
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
