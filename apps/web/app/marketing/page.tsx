'use client';

import { useState, useEffect } from 'react';
import { chairmanFetch } from '../lib/api';

type Tab = 'overview' | 'brand' | 'audiences' | 'campaigns' | 'content' | 'calendar' | 'analytics';

interface Metric {
  label: string;
  value: string | number;
  note?: string;
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [brand, setBrand] = useState<any>(null);
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    chairmanFetch('/marketing/analytics/metrics').then(r => r.data ? setMetrics(r.data) : null).catch(() => {});
    chairmanFetch('/marketing/campaigns').then(r => r.data ? setCampaigns(r.data) : null).catch(() => {});
    chairmanFetch('/marketing/content').then(r => r.data ? setContent(r.data) : null).catch(() => {});
    chairmanFetch('/marketing/brand').then(r => r.data ? setBrand(r.data) : null).catch(() => {});
    chairmanFetch('/marketing/personas').then(r => r.data ? setPersonas(r.data) : null).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'brand', label: 'Brand' },
    { id: 'audiences', label: 'Audiences' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'content', label: 'Content' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: '#888', REVIEW: '#f5a623', APPROVED: '#417505', ACTIVE: '#2e7d32',
      PUBLISHED: '#1565c0', SCHEDULED: '#6a1b9a', PAUSED: '#e65100',
      COMPLETED: '#37474f', CANCELLED: '#b71c1c', REJECTED: '#b71c1c',
    };
    return colors[status] ?? '#888';
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Marketing & Brand</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Autonomous marketing operations — governed by approval workflow</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeTab === t.id ? '#1976d2' : '#eee',
              color: activeTab === t.id ? '#fff' : '#333',
              fontWeight: activeTab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Impressions', value: metrics?.totalImpressions ?? '—', note: 'Observed only' },
              { label: 'Total Clicks', value: metrics?.totalClicks ?? '—', note: 'Observed only' },
              { label: 'Active Campaigns', value: metrics?.activeCampaigns ?? '—' },
              { label: 'Published Content', value: metrics?.publishedContent ?? '—' },
            ].map((m: Metric) => (
              <div key={m.label} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{m.value}</div>
                <div style={{ fontSize: 14, color: '#555' }}>{m.label}</div>
                {m.note && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{m.note}</div>}
              </div>
            ))}
          </div>
          {metrics?.analyticsDisclaimer && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              ⚠️ {metrics.analyticsDisclaimer}
            </div>
          )}
          {metrics?.forecastDisclaimer && (
            <div style={{ background: '#e3f2fd', border: '1px solid #1976d2', padding: 12, borderRadius: 6, fontSize: 13 }}>
              ℹ️ {metrics.forecastDisclaimer}
            </div>
          )}
        </div>
      )}

      {activeTab === 'brand' && (
        <div>
          {brand ? (
            <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8 }}>
              <h2 style={{ marginTop: 0 }}>{brand.brandName}</h2>
              {brand.positioning && <p><strong>Positioning:</strong> {brand.positioning}</p>}
              {brand.mission && <p><strong>Mission:</strong> {brand.mission}</p>}
              {brand.tone && <p><strong>Tone:</strong> {brand.tone}</p>}
              {brand.voice && <p><strong>Voice:</strong> {brand.voice}</p>}
              <p style={{ fontSize: 12, color: '#999' }}>Version {brand.version} · Last updated {new Date(brand.updatedAt).toLocaleDateString()}</p>
              {brand.guidelines?.length > 0 && (
                <div>
                  <h3>Active Guidelines ({brand.guidelines.length})</h3>
                  {brand.guidelines.map((g: any) => (
                    <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                      <span style={{ fontSize: 11, background: '#e0e0e0', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>{g.category}</span>
                      <strong>{g.title}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#999' }}>No brand profile configured. Create one via the API.</p>
          )}
        </div>
      )}

      {activeTab === 'audiences' && (
        <div>
          {personas.length === 0 ? (
            <p style={{ color: '#999' }}>No audience personas defined.</p>
          ) : (
            personas.map(p => (
              <div key={p.id} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 8px' }}>{p.name}</h3>
                {p.segment && <p style={{ margin: '4px 0', color: '#666' }}>Segment: {p.segment}</p>}
                {p.description && <p style={{ margin: '4px 0' }}>{p.description}</p>}
                {p.generatedByAI && <span style={{ fontSize: 11, background: '#e8f5e9', padding: '2px 6px', borderRadius: 4 }}>AI-generated — verify before use</span>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div>
          {campaigns.length === 0 ? (
            <p style={{ color: '#999' }}>No campaigns. Create one via the API.</p>
          ) : (
            campaigns.map(c => (
              <div key={c.id} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{c.name}</h3>
                  {c.objective && <p style={{ color: '#666', margin: '4px 0' }}>{c.objective}</p>}
                  {c.budgetRecommendation && (
                    <p style={{ fontSize: 12, color: '#999' }}>Budget recommendation: {c.budgetRecommendation} (advisory only — NOT spending authority)</p>
                  )}
                </div>
                <span style={{ background: getStatusColor(c.status), color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{c.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div>
          <div style={{ background: '#fff8e1', border: '1px solid #ffc107', padding: 10, borderRadius: 6, fontSize: 12, marginBottom: 16 }}>
            ⚠️ Drafts are NOT approved. AI-generated content requires explicit human review and approval before publication.
          </div>
          {content.length === 0 ? (
            <p style={{ color: '#999' }}>No content items. Create via the API.</p>
          ) : (
            content.map(c => (
              <div key={c.id} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{c.title}</h3>
                    <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{c.contentType} {c.channel ? `· ${c.channel}` : ''}</p>
                    {c.generatedByAI && <span style={{ fontSize: 11, background: '#e3f2fd', padding: '2px 6px', borderRadius: 4 }}>AI Draft — review required</span>}
                  </div>
                  <span style={{ background: getStatusColor(c.status), color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{c.status}</span>
                </div>
                <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>v{c.contentVersion} · Created {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div>
          <p style={{ color: '#666' }}>Content calendar — scheduled items require APPROVED content and proper publication governance.</p>
          <p style={{ color: '#999', fontSize: 13 }}>Calendar entries loaded via API. Use /marketing/calendar endpoint.</p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div>
          {metrics && (
            <div>
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
                ⚠️ ANALYTICS DISCLAIMER: Observed metrics only. Forecasts are projections — NOT realized revenue or outcomes.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Impressions (Observed)', value: metrics.totalImpressions },
                  { label: 'Clicks (Observed)', value: metrics.totalClicks },
                  { label: 'Conversions (Observed)', value: metrics.totalConversions },
                  { label: 'Total Campaigns', value: metrics.totalCampaigns },
                ].map((m: Metric) => (
                  <div key={m.label} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{m.value}</div>
                    <div style={{ fontSize: 14, color: '#555' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
