import { useCallback, useEffect, useRef, useState } from 'react';
import { getReasoningProvider } from '../integration/reasoning';
import { FoundationEngine } from '../foundation';
import { phraseReasoningError } from '../presence/errorPhrases';

const emptyStream = { active: false, messageId: null, content: '', reasoning: '', presence: 'quiet' };
const PRESENCE_THINKING = 'thinking';
const PRESENCE_SPEAKING = 'speaking';

function makeId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFrom(text) {
  const t = (text || '').trim();
  if (!t) return 'A new page';
  return t.split(/\s+/).slice(0, 7).join(' ').slice(0, 60);
}

/**
 * useConversation — Gaia's conversational state, in memory.
 */
export function useConversation() {
  const provider = useRef(getReasoningProvider()).current;

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [byConv, setByConv] = useState({});
  const [stream, setStream] = useState(emptyStream);
  const [health, setHealth] = useState({ status: 'unknown' });

  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    provider.health().then((h) => {
      if (cancelled) return;
      setHealth({ status: h.ok ? 'ready' : 'unreachable', detail: h.detail });
    }).catch(() => {
      if (cancelled) return;
      setHealth({ status: 'unreachable', detail: 'cannot reach reason engine' });
    });
    return () => { cancelled = true; };
  }, [provider]);

  const messages = activeId ? (byConv[activeId] || []) : [];

  const newConversation = useCallback((seed) => {
    const conv = { id: makeId(), title: titleFrom(seed || ''), createdAt: Date.now() };
    setConversations((c) => [conv, ...c]);
    setActiveId(conv.id);
    setStream(emptyStream);
    return conv.id;
  }, []);

  const openConversation = useCallback((id) => {
    setActiveId(id);
    setStream(emptyStream);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((c) => c.filter((x) => x.id !== id));
    setByConv((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const runStream = useCallback(async (convId, transcript) => {
    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = makeId();
    setStream({ active: true, messageId: assistantId, content: '', reasoning: '', presence: PRESENCE_THINKING });

    let fullText = '';
    let fullReasoning = '';
    try {
      await provider.stream(transcript, {
        signal: controller.signal,
        onDelta: (chunk, isReasoning) => {
          if (isReasoning) {
            fullReasoning += chunk;
            setStream((s) => ({
              ...s,
              presence: PRESENCE_THINKING,
              reasoning: (s.reasoning || '') + chunk
            }));
          } else {
            fullText += chunk;
            setStream((s) => ({
              ...s,
              presence: PRESENCE_SPEAKING,
              content: s.content + chunk
            }));
          }
        },
      });

      if (controller.signal.aborted) {
        setStream(emptyStream);
        return null;
      }

      setByConv((prev) => {
        const current = prev[convId] || [];
        return {
          ...prev,
          [convId]: [
            ...current,
            { id: assistantId, role: 'assistant', content: fullText, reasoning: fullReasoning, createdAt: Date.now() },
          ],
        };
      });
      setStream(emptyStream);
      return fullText;
    } catch (e) {
      if (controller.signal.aborted) {
        setStream(emptyStream);
        return null;
      }
      const phrase = phraseReasoningError(e);
      setStream(emptyStream);
      setByConv((prev) => {
        const current = prev[convId] || [];
        return {
          ...prev,
          [convId]: [
            ...current,
            { id: makeId(), role: 'assistant', content: phrase, createdAt: Date.now(), error: true },
          ],
        };
      });
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [provider]);

  const send = useCallback(async (text, attachments = []) => {
    const userText = (text || '').trim();
    if (!userText && attachments.length === 0) return;

    let convId = activeId;
    if (!convId) {
      convId = newConversation(userText || 'Attached files');
    } else {
      if (userText) {
        setConversations((c) => c.map((x) => (x.id === convId ? { ...x, title: titleFrom(userText) } : x)));
      }
    }

    const newMsg = { id: makeId(), role: 'user', content: userText, attachments, createdAt: Date.now() };

    setByConv((prev) => {
      const current = prev[convId] || [];
      return {
        ...prev,
        [convId]: [...current, newMsg],
      };
    });

    const currentConvMessages = byConv[convId] || [];
    const context = deriveContext([...currentConvMessages, newMsg]);
    const transcript = buildTranscript([
      { role: 'system', content: FoundationEngine.getPrompt(context) },
      ...currentConvMessages,
      newMsg,
    ]);

    await runStream(convId, transcript);
  }, [activeId, byConv, newConversation, runStream]);

  const editMessage = useCallback(async (messageId, newContent) => {
    if (!activeId) return;

    const current = byConv[activeId] || [];
    const index = current.findIndex((x) => x.id === messageId);
    if (index === -1) return;

    const truncated = current.slice(0, index + 1);
    truncated[index] = {
      ...truncated[index],
      content: newContent,
      createdAt: Date.now(),
    };

    setByConv((prev) => ({
      ...prev,
      [activeId]: truncated,
    }));

    const context = deriveContext(truncated);
    const transcript = buildTranscript([
      { role: 'system', content: FoundationEngine.getPrompt(context) },
      ...truncated,
    ]);

    await runStream(activeId, transcript);
  }, [activeId, byConv, runStream]);

  const deleteMessage = useCallback((messageId) => {
    if (!activeId) return;
    setByConv((prev) => {
      const current = prev[activeId] || [];
      return {
        ...prev,
        [activeId]: current.filter((x) => x.id !== messageId),
      };
    });
  }, [activeId]);

  const regenerate = useCallback(async (messageId) => {
    if (!activeId) return;

    const current = byConv[activeId] || [];
    const index = current.findIndex((x) => x.id === messageId);
    if (index === -1) return;

    const truncated = current.slice(0, index);
    setByConv((prev) => ({
      ...prev,
      [activeId]: truncated,
    }));

    const context = deriveContext(truncated);
    const transcript = buildTranscript([
      { role: 'system', content: FoundationEngine.getPrompt(context) },
      ...truncated,
    ]);

    await runStream(activeId, transcript);
  }, [activeId, byConv, runStream]);

  const retry = useCallback(async (messageId) => {
    if (!activeId) return;

    const current = byConv[activeId] || [];
    const index = current.findIndex((x) => x.id === messageId);
    if (index === -1) return;

    const truncated = current.slice(0, index);
    setByConv((prev) => ({
      ...prev,
      [activeId]: truncated,
    }));

    const context = deriveContext(truncated);
    const transcript = buildTranscript([
      { role: 'system', content: FoundationEngine.getPrompt(context) },
      ...truncated,
    ]);

    await runStream(activeId, transcript);
  }, [activeId, byConv, runStream]);

  return {
    conversations, activeId, messages, stream, health,
    newConversation, openConversation, deleteConversation,
    send, stop, editMessage, deleteMessage, regenerate, retry,
  };
}

function buildTranscript(messages) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function deriveContext(messages) {
  // Simple heuristic based on the entire conversation text so far
  const fullText = messages.map(m => m.content).join(' ').toLowerCase();
  
  if (
    fullText.includes('implement') || 
    fullText.includes('refactor') || 
    fullText.includes('architecture') || 
    fullText.includes('prompt') || 
    fullText.includes('code')
  ) {
    return { type: 'technical' };
  }
  
  if (
    fullText.includes('why did you answer like that') || 
    fullText.includes('what are your principles') || 
    fullText.includes('how do you think') || 
    fullText.includes('evolution')
  ) {
    return { type: 'gaia' };
  }
  
  return { type: 'conversation' };
}
