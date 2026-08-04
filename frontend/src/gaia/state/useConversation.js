import { useCallback, useEffect, useRef, useState } from 'react';
import { hermes } from '../lib/hermesClient';
import { uploadFile } from '../lib/api';
import { extractArtifacts } from '../lib/artifactParser';

const emptyStream = { active: false, messageId: null, content: '', tools: [], presence: 'resting' };

export function useConversation() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stream, setStream] = useState(emptyStream);
  const [canvas, setCanvas] = useState({ open: false, artifact: null });
  const [memory, setMemory] = useState({ open: false, loading: false, reflections: [] });
  const [booting, setBooting] = useState(true);

  const abortRef = useRef(null);
  const finalContentRef = useRef('');
  const memoryOpenRef = useRef(false);
  useEffect(() => { memoryOpenRef.current = memory.open; }, [memory.open]);

  const loadReflections = useCallback(async () => {
    const data = await hermes.listReflections();
    setMemory((s) => ({ ...s, loading: false, reflections: data.reflections || [] }));
  }, []);

  const refreshConversations = useCallback(async () => {
    const list = await hermes.listConversations();
    setConversations(list);
    return list;
  }, []);

  const openConversation = useCallback(async (id, { silent } = {}) => {
    const data = await hermes.getConversation(id);
    setActiveId(id);
    setMessages(data.messages || []);
    if (!silent) setCanvas({ open: false, artifact: null });
    return data.messages || [];
  }, []);

  const newConversation = useCallback(async () => {
    const conv = await hermes.createConversation();
    await refreshConversations();
    setActiveId(conv.id);
    setMessages([]);
    setCanvas({ open: false, artifact: null });
    return conv.id;
  }, [refreshConversations]);

  const deleteConversation = useCallback(async (id) => {
    await hermes.deleteConversation(id);
    const list = await refreshConversations();
    if (id === activeId) {
      if (list.length) await openConversation(list[0].id);
      else await newConversation();
    }
  }, [activeId, openConversation, newConversation, refreshConversations]);

  const runStream = useCallback(async (convId, body) => {
    finalContentRef.current = '';
    setStream({ ...emptyStream, active: true, presence: 'thinking' });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await hermes.stream(convId, body, (e) => {
        if (e.type === 'start') setStream((s) => ({ ...s, messageId: e.message_id }));
        else if (e.type === 'presence') setStream((s) => ({ ...s, presence: e.state }));
        else if (e.type === 'delta') {
          finalContentRef.current += e.content;
          setStream((s) => ({ ...s, content: s.content + e.content }));
        } else if (e.type === 'tool') {
          setStream((s) => {
            const tools = [...s.tools];
            const i = tools.findIndex((t) => t.id === e.id);
            const rec = { id: e.id, name: e.name, status: e.status, args: e.args, result: e.result };
            if (i === -1) tools.push(rec); else tools[i] = rec;
            return { ...s, tools };
          });
        } else if (e.type === 'error') {
          finalContentRef.current += `\n\n_(Gaia is momentarily unreachable: ${e.message})_`;
          setStream((s) => ({ ...s, content: s.content + `\n\n_(Gaia is momentarily unreachable.)_` }));
        }
      }, controller.signal);
    } catch (_) { /* aborted or network */ }

    abortRef.current = null;
    setStream(emptyStream);
    await openConversation(convId, { silent: true });
    await refreshConversations();

    const artifacts = extractArtifacts(finalContentRef.current);
    if (artifacts.length) setCanvas({ open: true, artifact: artifacts[artifacts.length - 1] });

    // Hindsight quietly reflects on the exchange — best-effort, never blocking.
    hermes.reflect(convId).then(() => { if (memoryOpenRef.current) loadReflections(); });
  }, [openConversation, refreshConversations, loadReflections]);

  const send = useCallback(async (text, files = []) => {
    let convId = activeId;
    if (!convId) convId = await newConversation();
    let atts = [];
    if (files.length) atts = await Promise.all(files.map(uploadFile));
    const optimistic = {
      id: `tmp-${Date.now()}`, role: 'user', content: text,
      attachments: atts, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    await runStream(convId, { content: text, attachment_ids: atts.map((a) => a.id) });
  }, [activeId, newConversation, runStream]);

  const retry = useCallback(async (assistantId) => {
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === assistantId);
      return i === -1 ? m : m.slice(0, i);
    });
    await runStream(activeId, { truncate_from_message_id: assistantId, resend_last_user: true });
  }, [activeId, runStream]);

  const editUser = useCallback(async (messageId, newText) => {
    setMessages((m) => {
      const i = m.findIndex((x) => x.id === messageId);
      const base = i === -1 ? m : m.slice(0, i);
      return [...base, { id: `tmp-${Date.now()}`, role: 'user', content: newText, attachments: [], created_at: new Date().toISOString() }];
    });
    await runStream(activeId, { truncate_from_message_id: messageId, content: newText });
  }, [activeId, runStream]);

  const stop = useCallback(() => { if (abortRef.current) abortRef.current.abort(); }, []);

  const openArtifact = useCallback((artifact) => setCanvas({ open: true, artifact }), []);
  const closeCanvas = useCallback(() => setCanvas((c) => ({ ...c, open: false })), []);

  const editArtifact = useCallback(async (messageId, ordinal, content) => {
    if (!messageId || messageId === 'streaming') return;
    const res = await hermes.editArtifact(activeId, messageId, ordinal, content);
    if (res && res.content != null) {
      setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, content: res.content } : x)));
    }
    setCanvas((c) => ({ ...c, artifact: c.artifact ? { ...c.artifact, content } : c.artifact }));
  }, [activeId]);

  const openMemory = useCallback(async () => {
    setMemory((s) => ({ ...s, open: true, loading: true }));
    await loadReflections();
  }, [loadReflections]);
  const closeMemory = useCallback(() => setMemory((s) => ({ ...s, open: false })), []);
  const forgetReflection = useCallback(async (id) => {
    setMemory((s) => ({ ...s, reflections: s.reflections.filter((r) => r.id !== id) }));
    await hermes.forgetReflection(id);
  }, []);

  useEffect(() => {
    (async () => {
      const list = await refreshConversations();
      if (list.length) await openConversation(list[0].id);
      else await newConversation();
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    conversations, activeId, messages, stream, canvas, memory, booting,
    newConversation, openConversation, deleteConversation,
    send, retry, editUser, stop, openArtifact, closeCanvas, editArtifact,
    openMemory, closeMemory, forgetReflection,
  };
}
