import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n, useTimeAgo } from '../lib/i18n';
import type { HistoryItem } from '../types';

const levelDot: Record<string, string> = {
  UNKNOWN: 'bg-gray-300',
  EXPOSED: 'bg-text-muted',
  UNDERSTOOD: 'bg-text-secondary',
  APPLIED: 'bg-text',
  TRANSFERRED: 'bg-text',
  CONSOLIDATED: 'bg-text',
};

export default function History({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const [states, setStates] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory(userId).then(setStates).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  const byTopic = states.reduce<Record<string, HistoryItem[]>>((acc, s) => {
    const topic = s.topic_name || s.concept_name;
    (acc[topic] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-extrabold text-text">{t('history.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {loading ? (
          <div className="text-center py-12 loading text-text-muted text-sm font-bold"><span>.</span><span>.</span><span>.</span></div>
        ) : states.length === 0 ? (
          <div className="text-center py-12 anim-fade">
            <div className="w-14 h-14 bg-surface-alt border-2 border-text rounded-sm flex items-center justify-center mx-auto mb-3 shadow-[3px_3px_0_#555]">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm font-bold text-text">{t('history.emptyTitle')}</p>
            <p className="text-xs text-text-muted font-semibold mt-1">{t('history.emptySub')}</p>
          </div>
        ) : (
          Object.entries(byTopic).map(([topic, items]) => (
            <div key={topic} className="anim-slide">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider mb-1.5">{topic}</h2>
              <div className="card rounded-sm overflow-hidden divide-y-2 divide-text">
                {items.map((s) => (
                  <div key={s.concept_name} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${levelDot[s.state] || 'bg-gray-200'}`} />
                    <span className="text-sm font-bold text-text flex-1 truncate">{s.concept_name}</span>
                    <span className="text-[10px] font-extrabold text-text">{Math.round(s.confidence * 100)}%</span>
                    <span className="text-[10px] font-semibold text-text-muted shrink-0">{timeAgo(s.updated_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}