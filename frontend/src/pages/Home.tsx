import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n, useTimeAgo } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import type { HomeResponse, ReviewQueueItem, Settings, Topic, TopicStat, WeeklyGoal } from '../types';

const levelDot: Record<string, string> = {
  UNKNOWN: 'bg-gray-300',
  EXPOSED: 'bg-text-muted',
  UNDERSTOOD: 'bg-text-secondary',
  APPLIED: 'bg-text',
  TRANSFERRED: 'bg-text',
  CONSOLIDATED: 'bg-text',
};

const levelPill: Record<string, string> = {
  EXPOSED: 'bg-surface-alt text-text-secondary',
  UNDERSTOOD: 'bg-gray-200 text-text',
  APPLIED: 'bg-text text-white',
  TRANSFERRED: 'bg-text text-white',
};

const statusKey: Record<string, string> = {
  'Needs reinforcement': 'status.weak',
  'Review available': 'status.review',
  Deepening: 'status.strong',
  Developing: 'status.learning',
};

const TECHNIQUES = [
  { key: 'EXPLANATION', labelKey: 'tech.EXPLANATION', descKey: 'tech.d.EXPLANATION' },
  { key: 'WORKED_EXAMPLE', labelKey: 'tech.WORKED_EXAMPLE', descKey: 'tech.d.WORKED_EXAMPLE' },
  { key: 'RETRIEVAL', labelKey: 'tech.RETRIEVAL', descKey: 'tech.d.RETRIEVAL' },
  { key: 'APPLICATION', labelKey: 'tech.APPLICATION', descKey: 'tech.d.APPLICATION' },
  { key: 'VARIATION', labelKey: 'tech.VARIATION', descKey: 'tech.d.VARIATION' },
  { key: 'TRANSFER', labelKey: 'tech.TRANSFER', descKey: 'tech.d.TRANSFER' },
  { key: 'COMPRESSION', labelKey: 'tech.COMPRESSION', descKey: 'tech.d.COMPRESSION' },
];

function accuracyBarColor(acc: number): string {
  if (acc < 50) return 'bg-red';
  if (acc < 75) return 'bg-text-secondary';
  return 'bg-text';
}

export default function Home({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const { t, plural, language } = useI18n();
  const timeAgo = useTimeAgo();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyGoal | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    api.getHome(userId).then(setData).catch(console.error);
    api.getSettings().then(setSettings).catch(console.error);
    api.getStats(userId).then((r) => setStats(r.topic_stats)).catch(console.error);
    api.getReviewQueue(userId).then((r) => setQueue(r.items)).catch(console.error);
    api.getWeeklyGoal(userId).then(setWeekly).catch(console.error);
  }, [userId, language]);

  const startReview = async (item: ReviewQueueItem) => {
    setStartingId(item.concept_id);
    try {
      const s = await api.createSession(userId, item.topic_id, item.concept_id);
      navigate(`/session/${s.id}`);
    } catch {}
    finally { setStartingId(null); }
  };

  const setGoal = async () => {
    const n = parseInt(goalInput);
    if (isNaN(n) || n < 1 || n > 99) return;
    await api.updateSettings({ weekly_goal: String(n) });
    setGoalInput('');
    api.getWeeklyGoal(userId).then(setWeekly).catch(console.error);
  };

  const handleCreate = async () => {
    if (!topicName.trim()) return;
    setLoading(true);
    try {
      const topic = await api.createTopic(userId, topicName, topicDesc);
      await api.decomposeTopic(topic.id);
      navigate(`/topic/${topic.id}`);
    } catch {} finally { setLoading(false); }
  };

  const toggleTechnique = async (key: string) => {
    if (!settings) return;
    const enabled = settings.enabled_techniques.split(',').map((s) => s.trim()).filter(Boolean);
    const next = enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key];
    const updated = await api.updateSettings({ enabled_techniques: next.join(',') });
    setSettings(updated);
  };

  const enabledSet = settings ? new Set(settings.enabled_techniques.split(',').map((s) => s.trim())) : null;
  const name = settings?.name || '';
  const h = new Date().getHours();
  const greeting = name
    ? (h < 12 ? t('greet.morning', { name }) : h < 18 ? t('greet.afternoon', { name }) : t('greet.evening', { name }))
    : t('greet.welcome');

  const statusLine = !data
    ? t('home.loading')
    : data.total_concepts === 0
    ? t('home.readyNew')
    : data.needs_review > 0
    ? t('home.review', { what: plural(data.needs_review, 'word.concept') })
    : data.learning > 0
    ? t('home.learningProgress', { what: plural(data.learning, 'word.concept') })
    : t('home.caughtUp');

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-text rounded-sm flex items-center justify-center shadow-[3px_3px_0_#555]">
              <span className="text-sm font-extrabold text-white">C</span>
            </div>
            <span className="font-extrabold text-sm text-text tracking-wide">COGNIS</span>
          </div>
          <nav className="flex items-center gap-2">
            {[
              { labelKey: 'nav.knowledge', path: '/knowledge' },
              { labelKey: 'nav.history', path: '/history' },
              { labelKey: 'nav.settings', path: '/settings' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text hover:bg-surface-alt rounded-sm transition-colors"
              >
                {t(item.labelKey)}
              </button>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* ===== LEFT: learning content ===== */}
          <div className="space-y-5 min-w-0">
            <div className="flex items-start justify-between anim-fade">
              <div>
                <h1 className="text-xl font-extrabold text-text">{greeting}</h1>
                <p className="text-sm text-text-secondary font-semibold mt-0.5">{statusLine}</p>
              </div>
              {data && data.total_concepts > 0 && (
                <div className="flex gap-2 shrink-0 ml-4">
                  <div className="card px-3 py-2 rounded-sm text-center">
                    <div className="text-lg font-extrabold">{data.mastered}</div>
                    <div className="text-[10px] font-bold text-text-muted uppercase">{t('home.mastered')}</div>
                  </div>
                  <div className="card px-3 py-2 rounded-sm text-center">
                    <div className="text-lg font-extrabold">{data.learning}</div>
                    <div className="text-[10px] font-bold text-text-muted uppercase">{t('home.learningShort')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="card rounded-sm overflow-hidden anim-slide d1">
              {!showNew ? (
                <button onClick={() => setShowNew(true)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-surface-alt transition-colors text-left">
                  <div className="w-10 h-10 bg-surface-alt border-2 border-text rounded-sm flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold">+</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-text">{t('home.newTopic')}</span>
                    <p className="text-xs text-text-muted font-semibold">{t('home.newTopicHint')}</p>
                  </div>
                </button>
              ) : (
                <div className="p-5 space-y-3 anim-fade">
                  <input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)}
                    placeholder={t('home.topicPlaceholder')}
                    className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm" autoFocus />
                  <input type="text" value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)}
                    placeholder={t('home.descPlaceholder')}
                    className="input w-full px-4 py-3 text-sm font-semibold text-text-secondary placeholder-text-muted rounded-sm" />
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleCreate} disabled={loading || !topicName.trim()}
                      className="btn btn-primary flex-1 py-3 font-bold text-sm rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none">
                      {loading ? t('home.thinking') : t('home.begin')}
                    </button>
                    <button onClick={() => { setShowNew(false); setTopicName(''); setTopicDesc(''); }}
                      className="btn btn-ghost px-4 py-3 text-sm font-bold text-text-muted rounded-sm">
                      {t('home.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {queue.length > 0 && (
              <div className="anim-slide d1">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('home.dueNow')}</h2>
                  <span className="text-[10px] font-bold text-text-muted">{queue.length}</span>
                </div>
                <div className="space-y-2">
                  {queue.map((item, i) => (
                    <button key={item.concept_id} onClick={() => startReview(item)} disabled={startingId === item.concept_id}
                      className="card w-full px-4 py-3 flex items-center gap-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_#111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#111] transition-all text-left group rounded-sm anim-fade"
                      style={{ animationDelay: `${i * 0.04}s` }}>
                      <span className="w-8 h-8 bg-text text-white rounded-sm flex items-center justify-center text-sm font-extrabold shrink-0">
                        {startingId === item.concept_id ? '…' : '↻'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-text group-hover:underline block truncate">{item.concept_name}</span>
                        <span className="text-xs text-text-muted font-semibold">{Math.round(item.confidence * 100)}%</span>
                      </div>
                      {item.due && (
                        <span className="text-[10px] font-extrabold bg-surface-alt border border-text px-2 py-0.5 rounded-sm text-text-secondary shrink-0">
                          {t('status.review')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data && data.continue_items.length > 0 && (
              <div className="anim-slide d2">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('home.continue')}</h2>
                  <button onClick={() => navigate('/knowledge')} className="text-xs font-bold text-text hover:underline">{t('home.viewAll')}</button>
                </div>
                <div className="space-y-2">
                  {data.continue_items.slice(0, 4).map((item, i) => (
                    <button key={item.concept_name} onClick={() => navigate('/knowledge')}
                      className="card w-full px-4 py-3 flex items-center gap-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_#111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#111] transition-all text-left group rounded-sm anim-fade"
                      style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${levelDot[item.knowledge_level]}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-text group-hover:underline block truncate">{item.concept_name}</span>
                        <span className="text-xs text-text-muted font-semibold">{item.topic_name}</span>
                      </div>
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-sm shrink-0 ${levelPill[item.knowledge_level] || 'bg-surface-alt text-text-muted'}`}>
                        {t(statusKey[item.status] || 'status.learning')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data && data.recent_topics.length > 0 && (
              <div className="anim-slide d3">
                <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider mb-2.5">{t('home.topics')}</h2>
                <div className="card rounded-sm overflow-hidden divide-y-2 divide-text">
                  {data.recent_topics.map((topic: Topic, i: number) => (
                    <button key={topic.id} onClick={() => navigate(`/topic/${topic.id}`)}
                      className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-surface-alt transition-colors group text-left anim-fade"
                      style={{ animationDelay: `${i * 0.03}s` }}>
                      <span className="text-sm font-bold text-text group-hover:underline">{topic.name}</span>
                      <span className="text-text-muted group-hover:text-text transition-colors text-sm">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data && data.recent_activity.length > 0 && (
              <div className="anim-slide d4">
                <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider mb-2.5">{t('home.recentActivity')}</h2>
                <div className="space-y-1">
                  {data.recent_activity.map((act, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm anim-fade" style={{ animationDelay: `${i * 0.03}s` }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-text shrink-0" />
                      <span className="font-bold text-text">{act.concept_name}</span>
                      <span className="text-text-muted font-semibold text-xs">·</span>
                      <span className="text-text-muted font-semibold text-xs">{act.topic_name}</span>
                      <span className="text-text-muted font-semibold text-xs ml-auto">{timeAgo(act.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data && data.total_concepts === 0 && (
              <div className="text-center py-12 anim-fade d2">
                <div className="w-16 h-16 bg-surface-alt border-2 border-text rounded-sm flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0_#555]">
                  <span className="text-3xl">🧠</span>
                </div>
                <p className="text-sm font-bold text-text">{t('home.emptyTitle')}</p>
                <p className="text-xs text-text-muted font-semibold mt-1">{t('home.emptySub')}</p>
              </div>
            )}
          </div>

          {/* ===== RIGHT: analytics + techniques ===== */}
          <aside className="space-y-5 lg:sticky lg:top-20">
            {weekly && (
              <div className="card rounded-sm overflow-hidden anim-slide d1">
                <div className="px-4 py-3 border-b-2 border-text flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('home.weeklyGoal')}</h2>
                  <span className="text-[10px] font-bold text-text-muted">{weekly.week_start}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-extrabold text-text">{Math.min(weekly.achieved, weekly.goal)}/{weekly.goal}</span>
                    <span className="text-[10px] font-bold text-text-muted">{t('home.weeklyGoalSub', { a: weekly.achieved, g: weekly.goal })}</span>
                  </div>
                  <div className="h-2.5 bg-surface-alt border border-text rounded-sm overflow-hidden">
                    <div className="h-full bg-text transition-all duration-700" style={{ width: `${Math.min(100, (weekly.achieved / weekly.goal) * 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" min={1} max={99} value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setGoal()}
                      placeholder={String(weekly.goal)}
                      className="input w-16 px-2 py-1.5 text-xs font-bold text-text placeholder-text-muted rounded-sm" />
                    <button onClick={setGoal} className="btn btn-ghost px-3 py-1.5 text-[11px] font-bold text-text rounded-sm">
                      {t('home.set')}
                    </button>
                    <span className="text-[10px] font-bold text-text-muted ml-auto">{t('home.editGoal')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card rounded-sm overflow-hidden anim-slide d2">
              <div className="px-4 py-3 border-b-2 border-text">
                <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('home.accuracy')}</h2>
              </div>
              {stats.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-text-muted font-semibold">{t('home.accuracyEmpty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border-light">
                  {stats.map((s) => (
                    <div key={s.topic_name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-text truncate mr-2">{s.topic_name}</span>
                        <span className="text-sm font-extrabold text-text shrink-0">{s.accuracy}%</span>
                      </div>
                      <div className="h-2 bg-surface-alt border border-text rounded-sm overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${accuracyBarColor(s.accuracy)}`} style={{ width: `${s.accuracy}%` }} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-text-muted">
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-text rounded-full" />{s.correct} {t('home.right')}</span>
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-text-secondary rounded-full" />{s.partial} {t('home.partial')}</span>
                        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red rounded-full" />{s.wrong} {t('home.wrong')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {enabledSet && (
              <div className="card rounded-sm overflow-hidden anim-slide d3">
                <div className="px-4 py-3 border-b-2 border-text flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('home.techniques')}</h2>
                  <span className="text-[10px] font-bold text-text-muted">{enabledSet.size}/{TECHNIQUES.length} {t('home.on')}</span>
                </div>
                <div className="divide-y divide-border-light">
                  {TECHNIQUES.map((tech) => {
                    const on = enabledSet.has(tech.key);
                    return (
                      <button key={tech.key} onClick={() => toggleTechnique(tech.key)}
                        className="w-full px-4 py-2.5 flex items-start gap-3 text-left hover:bg-surface-alt transition-colors">
                        <span className={`w-4 h-4 border-2 border-text rounded-sm mt-0.5 flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-text' : 'bg-white'}`}>
                          {on && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm font-bold ${on ? 'text-text' : 'text-text-muted line-through decoration-1'}`}>
                          {t(tech.labelKey)}
                          <span className="block text-[10px] font-semibold mt-0.5 normal-case no-underline">{t(tech.descKey)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}