import { useCallback, useEffect, useRef, useState } from 'react';
import { getReasoningProvider } from '../integration/reasoning';
import { SOUL_SYSTEM } from '../identity/soul';
import { phraseReasoningError } from '../presence/errorPhrases';

const emptyStream = { active: false, messageId: null, content: '', presence: 'quiet' };
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
 *
 * The state is intentionally simple for this milestone: a list of in-memory
 * conversations, the active one, and a streaming channel to the reasoning
 * provider. Persistence, memory, knowledge, and tools are out of scope here.
 *
 * On mount, the provider's health is probed. A calm, Gaia-language status
 * is exposed so the desktop can surface (or quietly not surface) it.
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
    setStream({ active: true, messageId: assistantId, content: '', presence: PRESENCE_THINKING });

    let fullText = '';
    try {
      await provider.stream(transcript, {
        signal: controller.signal,
        onDelta: (chunk) => {
          fullText += chunk;
          setStream((s) => (
            s.presence === PRESENCE_SPEAKING
              ? { ...s, content: s.content + chunk }
              : { ...s, presence: PRESENCE_SPEAKING, content: s.content + chunk }
          ));
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
            { id: assistantId, role: 'assistant', content: fullText, createdAt: Date.now() },
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
            { id: makeId(), role: 'assistant', content: phrase, createdAt: Date.now() },
          ],
        };
      });
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [provider]);

  const send = useCallback(async (text) => {
    const userText = (text || '').trim();
    if (!userText) return;

    let convId = activeId;
    if (!convId) {
      convId = newConversation(userText);
    } else {
      setConversations((c) => c.map((x) => (x.id === convId ? { ...x, title: titleFrom(userText) } : x)));
    }

    setByConv((prev) => {
      const current = prev[convId] || [];
      return {
        ...prev,
        [convId]: [
          ...current,
          { id: makeId(), role: 'user', content: userText, createdAt: Date.now() },
        ],
      };
    });

    const transcript = buildTranscript([
      { role: 'system', content: SOUL_SYSTEM },
      ...(byConv[convId] || []),
      { role: 'user', content: userText },
    ]);

    await runStream(convId, transcript);
  }, [activeId, byConv, newConversation, runStream]);

  return {
    conversations, activeId, messages, stream, health,
    newConversation, openConversation, deleteConversation,
    send, stop,
  };
}

function buildTranscript(messages) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
