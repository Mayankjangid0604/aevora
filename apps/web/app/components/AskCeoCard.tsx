'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { chairmanFetch } from '../lib/api';

type Exchange = { question: string; answer: string; answeredAt: string };

/** Typed Chairman → CEO channel: ask anything, answered immediately from live business data. */
export default function AskCeoCard() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    const r = await chairmanFetch<Exchange>('/ceo/ask', { method: 'POST', body: { question } });
    setBusy(false);
    if (r.error || !r.data) return setError(r.error ?? 'No answer');
    setHistory((h) => [r.data!, ...h].slice(0, 5));
    setQuestion('');
  };

  return (
    <section className="section">
      <div className="section-title">Ask the CEO</div>
      <div className="card">
        <form onSubmit={ask} style={{ display: 'flex', gap: 8 }}>
          <input
            aria-label="Question for the CEO"
            style={{ flex: 1 }}
            placeholder="e.g. Why did revenue drop this week? Which leads should I call first?"
            value={question}
            maxLength={1000}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !question.trim()}>
            <Send size={14} aria-hidden="true" /> {busy ? 'Thinking…' : 'Ask'}
          </button>
        </form>
        {error && <div className="card-sub" style={{ color: 'var(--status-critical)', marginTop: 10 }}>⚠ {error}</div>}
        {history.map((x, i) => (
          <div key={x.answeredAt + i} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>You asked: {x.question}</div>
            <div style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{x.answer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
