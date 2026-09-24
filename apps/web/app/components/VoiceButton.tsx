'use client';

import { useEffect, useRef, useState } from 'react';
import { chairmanFetch } from '../lib/api';

type State = 'idle' | 'listening' | 'thinking';

export default function VoiceButton() {
  const [state, setState] = useState<State>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const recognition = useRef<any>(null);
  const sessionId = useRef<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setSupported(false);
    const r = new SR();
    r.lang = 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => send(e.results[0][0].transcript);
    r.onerror = (e: any) => { setState('idle'); show(`Mic error: ${e.error}`); };
    r.onend = () => setState((s) => (s === 'listening' ? 'idle' : s));
    recognition.current = r;
    return () => r.abort();
  }, []);

  function show(text: string) {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 8000);
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    window.speechSynthesis.speak(u);
  }

  async function send(transcript: string) {
    setState('thinking');
    show(`“${transcript}”`);
    if (!sessionId.current) {
      const s = await chairmanFetch<{ id: string }>('/voice/sessions', { method: 'POST' });
      sessionId.current = s.data?.id ?? null;
    }
    const { data, error } = await chairmanFetch<{ naturalLanguageReply: string }>('/voice/command', {
      method: 'POST',
      body: { transcript, ...(sessionId.current ? { sessionId: sessionId.current } : {}) },
    });
    setState('idle');
    const reply = data?.naturalLanguageReply ?? `Voice command failed: ${error}`;
    show(reply);
    if (data) speak(reply);
  }

  function toggle() {
    if (!supported) return show('Speech recognition is not supported in this browser (use Chrome or Edge).');
    if (state === 'listening') return recognition.current?.stop();
    if (state === 'thinking') return;
    setState('listening');
    recognition.current?.start();
  }

  const bg = state === 'listening' ? 'var(--status-critical)' : state === 'thinking' ? 'var(--status-caution)' : 'var(--accent-blue)';

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', right: 24, bottom: 96, maxWidth: 360, zIndex: 1000,
            background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)',
            borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.4, boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          }}
        >
          {toast}
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={state === 'listening' ? 'Stop listening' : 'Speak a command'}
        title={state === 'listening' ? 'Listening… click to stop' : 'Voice command'}
        style={{
          position: 'fixed', right: 24, bottom: 24, width: 56, height: 56, borderRadius: '50%', zIndex: 1000,
          border: 'none', cursor: state === 'thinking' ? 'wait' : 'pointer', background: bg, color: '#fff',
          boxShadow: '0 6px 18px rgba(0,0,0,.4)', display: 'grid', placeItems: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
        </svg>
      </button>
    </>
  );
}
