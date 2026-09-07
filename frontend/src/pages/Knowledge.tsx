import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type {
  ConfidenceTimelineItem,
  ErrorAnalysisConcept,
  KnowledgeState,
} from '../types';

const levelDot: Record<string, string> = {
  UNKNOWN: 'bg-gray-300',
  EXPOSED: 'bg-text-muted',
  UNDERSTOOD: 'bg-text-secondary',
  APPLIED: 'bg-text',
  TRANSFERRED: 'bg-text',
  CONSOLIDATED: 'bg-text',
};

function Sparkline({ points, width = 44, height = 16 }: { points: [string, number][]; width?: number; height?: number }) {
  if (points.length < 2) {
    const y = Math.round((points[0]?.[1] ?? 0) * height);
    return (
      <svg width={width} height={height} className="opacity-60">
        <line x1={0} y1={height - y} x2={width} y2={height - y} stroke="#111" strokeWidth="2" />
      </svg>
    );
  }
  const n = points.length;
  const pts = points.map(([, conf], i) => {
    const x = (i / (n - 1)) * (width - 2) + 1;
    const y = height - 2 - Math.round(conf * (height - 4));
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke="#111" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Knowledge({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [states, setStates] = useState<KnowledgeState[]>([]);
  const [errors, setErrors] = useState<Map<number, ErrorAnalysisConcept>>(new Map());
  const [timeline, setTimeline] = useState<Map<number, ConfidenceTimelineItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    api.getKnowledgeStates(userId).then(setStates).catch(console.error);
    api.getErrorAnalysis(userId).then((r) => {
      setErrors(new Map(r.concepts.map((c) => [c.concept_id, c])));
    }).catch(console.error);
    api.getConfidenceTimeline(userId).then((r) => {
      setTimeline(new Map(r.concepts.map((c) => [c.concept_id, c])));
    }).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  const reviewConcept = async (s: KnowledgeState) => {
    if (!s.topic_id) return;
    setStartingId(s.concept_id);
    try {
      const sess = await api.startSession(userId, s.topic_id, s.concept_id);
      navigate(`/session/${sess.id}`);
    } catch {}
    finally { setStartingId(null); }
  };

  const byTopic = states.reduce<Record<string, KnowledgeState[]>>((acc, s) => {
    const topic = s.topic_name || s.concept_name;
    (acc[topic] ||= []).push(s);
    return acc;
  }, {});

  const mastered = states.filter((s) => ['APPLIED', 'TRANSFERRED', 'CONSOLIDATED'].includes(s.state)).length;
  const pct = states.length > 0 ? Math.round((mastered / states.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-extrabold text-text">{t('knowledge.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <div className="card rounded-sm p-5 anim-fade">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('knowledge.overall')}</span>
            <span className="text-sm font-extrabold text-text">{t('knowledge.masteredPct', { p: pct })}</span>
          </div>
          <div className="h-3 bg-surface-alt border border-text rounded-sm overflow-hidden">
            <div className="h-full bg-text transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-text-muted font-semibold mt-2">{t('knowledge.summary', { m: mastered, t: states.length })}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 loading text-text-muted text-sm font-bold"><span>.</span><span>.</span><span>.</span></div>
        ) : states.length === 0 ? (
          <div className="text-center py-12 anim-fade">
            <div className="w-14 h-14 bg-surface-alt border-2 border-text rounded-sm flex items-center justify-center mx-auto mb-3 shadow-[3px_3px_0_#555]">
              <span className="text-2xl">📖</span>
            </div>
            <p className="text-sm font-bold text-text">{t('knowledge.emptyTitle')}</p>
            <p className="text-xs text-text-muted font-semibold mt-1">{t('knowledge.emptySub')}</p>
          </div>
        ) : (
          Object.entries(byTopic).map(([topic, items]) => (
            <div key={topic} className="anim-slide">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{topic}</h2>
                <span className="text-[10px] font-bold text-text-muted">
                  {items.filter((s) => ['APPLIED', 'TRANSFERRED', 'CONSOLIDATED'].includes(s.state)).length}/{items.length}
                </span>
              </div>
              <div className="card rounded-sm overflow-hidden divide-y-2 divide-text">
                {items.map((s) => {
                  const err = errors.get(s.concept_id);
                  const tl = timeline.get(s.concept_id);
                  const weak = s.confidence < 0.5;
                  return (
                    <div key={s.concept_name} className="px-4 py-3 bg-white">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${levelDot[s.state]}`} />
                        <span className={`text-sm font-bold text-text flex-1 truncate ${weak ? '' : ''}`}>{s.concept_name}</span>
                        {tl && tl.points.length > 0 && (
                          <Sparkline points={tl.points} />
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-14 h-2 bg-surface-alt border border-text rounded-sm overflow-hidden hidden sm:block">
                            <div className="h-full bg-text transition-all duration-500" style={{ width: `${Math.round(s.confidence * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-extrabold text-text w-7 text-right">{Math.round(s.confidence * 100)}%</span>
                        </div>
                        {s.topic_id && (
                          <button onClick={() => reviewConcept(s)} disabled={startingId === s.concept_id}
                            className="btn btn-ghost px-2.5 py-1.5 text-[10px] font-extrabold rounded-sm shrink-0 disabled:opacity-50">
                            {startingId === s.concept_id ? '…' : t('knowledge.review')}
                          </button>
                        )}
                      </div>
                      {err && (
                        <div className="mt-2 flex items-center gap-2 pl-[22px]">
                          {err.error_types && Object.keys(err.error_types).length > 0 ? (
                            <span className="text-[10px] font-bold bg-surface-alt border border-text rounded-sm px-2 py-0.5 text-text-secondary uppercase">
                              {t('knowledge.errorType', { e: t(`err.${err.dominant_error}`) })}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-text-muted">{t('knowledge.noErrors')}</span>
                          )}
                          <span className="text-[10px] font-semibold text-text-muted">
                            {err.total} · {err.correct} {t('home.right')} / {err.partial} {t('home.partial')} / {err.wrong} {t('home.wrong')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}