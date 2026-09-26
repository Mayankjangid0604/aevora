'use client';

import { useEffect, useRef, useState } from 'react';
import { chairmanFetch } from '../lib/api';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  intent?: any;
  createdAt: string;
}

interface PcTask {
  id: string;
  taskType: string;
  instruction: string;
  createdAt: string;
}

const QUICK_COMMANDS = [
  'Status report',
  'Check revenue',
  'Find new leads',
  'Ask CEO: what is the biggest bottleneck?',
  'Pause simulation',
  'Resume simulation',
];

function taskSummary(task: PcTask): string {
  try {
    const parsed = JSON.parse(task.instruction || '{}');
    return String(parsed.message ?? task.instruction).substring(0, 60);
  } catch {
    return task.instruction.substring(0, 60);
  }
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pcTasks, setPcTasks] = useState<PcTask[]>([]);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data } = await chairmanFetch<Message[]>('/assistant/messages');
    if (data) setMessages([...data].reverse());
  }

  async function loadPcTasks() {
    const { data } = await chairmanFetch<PcTask[]>('/assistant/pc-tasks');
    if (data) setPcTasks(data);
  }

  useEffect(() => {
    loadMessages();
    loadPcTasks();
    const interval = setInterval(() => {
      loadMessages();
      loadPcTasks();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { id: 'temp', from: 'CHAIRMAN', to: 'ASSISTANT', content: msg, createdAt: new Date().toISOString() }]);

    const startTime = Date.now();
    const { error } = await chairmanFetch('/assistant/message', { method: 'POST', body: { message: msg } });
    setLastResponseTime(Date.now() - startTime);
    if (error) {
      setMessages((prev) => [...prev, { id: 'err', from: 'ASSISTANT', to: 'CHAIRMAN', content: `Error: ${error}`, createdAt: new Date().toISOString() }]);
    } else {
      await Promise.all([loadMessages(), loadPcTasks()]);
    }
    setLoading(false);
  }

  return (
    <div className="assistant-page">
      <div className="assistant-chat">
        <div className="assistant-chat-head">
          <h1>SAAHVIK Assistant</h1>
          <p>Your personal AI — talks to CEO, employees, and controls the company</p>
          {lastResponseTime !== null && (
            <p className="assistant-hint" style={{ textAlign: 'left', margin: '6px 0 0' }}>
              Last response:{' '}
              {lastResponseTime < 1000
                ? `${lastResponseTime} ms`
                : `${(lastResponseTime / 1000).toFixed(1)} s${lastResponseTime > 5000 ? ' (model call)' : ''}`}
            </p>
          )}
        </div>

        <div className="assistant-log" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">Assistant ready</div>
              <div className="empty-state-desc">Type a command or use the quick buttons below.</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id + i} className={`assistant-msg${msg.from === 'CHAIRMAN' ? ' mine' : ''}`}>
              {msg.from !== 'CHAIRMAN' && <div className="who">{msg.from === 'ASSISTANT' ? 'Assistant' : msg.from}</div>}
              <div className="body">{msg.content}</div>
              <div className="time">{new Date(msg.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {loading && <div className="assistant-hint" style={{ textAlign: 'left' }}>Assistant is thinking…</div>}
          <div ref={bottomRef} />
        </div>

        <div className="assistant-compose">
          <div className="assistant-quick">
            {QUICK_COMMANDS.map((cmd) => (
              <button key={cmd} onClick={() => setInput(cmd)} className="assistant-chip">{cmd}</button>
            ))}
          </div>
          <p className="assistant-hint" style={{ textAlign: 'left', margin: '0 0 8px' }}>
            Status/revenue responses are cached for 30 seconds
          </p>
          <div className="assistant-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tell the assistant what to do..."
              aria-label="Message to assistant"
              className="assistant-input"
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn btn-primary">
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {pcTasks.length > 0 && (
        <aside className="assistant-tasks">
          <div className="section-title">Pending PC Tasks ({pcTasks.length})</div>
          {pcTasks.map((task) => (
            <div key={task.id} className="assistant-task">
              <div className="type">{task.taskType}</div>
              <div style={{ marginTop: 4 }}>{taskSummary(task)}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{new Date(task.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          <p className="assistant-hint" style={{ textAlign: 'left' }}>PC tasks need manual execution. Open Claude Code or browser to complete them.</p>
        </aside>
      )}
    </div>
  );
}
