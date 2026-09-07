import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import type { Activity, ActivityContent, Attempt, SessionSummary } from '../types';

export default function Session() {
  const navigate = useNavigate();
  const { t, plural } = useI18n();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [content, setContent] = useState<ActivityContent | null>(null);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [showWorkedExample, setShowWorkedExample] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const startTime = useRef(Date.now());

  const loadNext = async () => {
    if (!sessionId) return;
    setLoading(true); setAttempt(null); setAnswer(''); setSelectedOption(null);
    setHintIndex(0); setHints([]); setShowWorkedExample(false); setStepIndex(0);
    try {
      const act = await api.getNextActivity(parseInt(sessionId));
      if (act.session_complete) {
        const s = await api.getSessionSummary(parseInt(sessionId));
        setSummary(s); setActivity(null); setContent(null);
      } else {
        setActivity(act); setContent(JSON.parse(act.content));
        setQuestionCount((c) => c + 1); startTime.current = Date.now();
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadNext(); }, [sessionId]);

  const handleSubmit = async () => {
    if (!activity || (!answer.trim() && selectedOption === null)) return;
    setSubmitting(true);
    const responseTime = (Date.now() - startTime.current) / 1000;
    const finalAnswer = selectedOption !== null ? content?.options?.[selectedOption] || '' : answer;
    try { setAttempt(await api.submitAttempt(activity.id, finalAnswer, responseTime, hintIndex)); }
    catch {} finally { setSubmitting(false); }
  };

  const loadHint = async () => {
    if (!activity) return;
    try {
      const res = await api.getHint(activity.id, hintIndex);
      if (res.hint) { setHints((p) => [...p, res.hint!]); setHintIndex(res.index + 1); }
    } catch {}
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (summary || loading) return;
      const target = e.target as HTMLElement;
      if (attempt) {
        if (e.key === 'Enter') { e.preventDefault(); loadNext(); }
        return;
      }
      if (target && target.tagName === 'TEXTAREA') return;
      if (content?.options) {
        const idx = ['1', '2', '3'].indexOf(e.key);
        if (idx >= 0 && idx < content.options.length) {
          e.preventDefault();
          setSelectedOption(idx);
          return;
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, loading, attempt, content, answer, selectedOption, sessionId, questionCount]);

  if (summary) {
    const topError = Object.entries(summary.error_types).sort((a, b) => b[1] - a[1])[0];
    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-white border-b-2 border-text sticky top-0 z-20">
          <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
            <span className="text-xs font-extrabold text-text tracking-wide uppercase">{t('summary.title')}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
          <div className="text-center py-4 anim-fade">
            <div className="w-16 h-16 bg-text rounded-sm flex items-center justify-center mx-auto mb-3 shadow-[5px_5px_0_#555] anim-bounce">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-lg font-extrabold text-text">{t('session.completeTitle')}</p>
            <p className="text-sm text-text-secondary font-semibold mt-0.5">
              {t('session.completeSub', { what: `${summary.total}` })}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 anim-slide d1">
            {[
              { label: t('summary.right'), value: summary.correct },
              { label: t('summary.partial'), value: summary.partial },
              { label: t('summary.wrong'), value: summary.wrong },
              { label: t('summary.accuracy'), value: `${summary.accuracy}%` },
            ].map((cell) => (
              <div key={cell.label} className="card rounded-sm px-4 py-3 text-center">
                <div className="text-lg font-extrabold text-text">{cell.value}</div>
                <div className="text-[10px] font-bold text-text-muted uppercase mt-0.5">{cell.label}</div>
              </div>
            ))}
          </div>

          <div className="card rounded-sm overflow-hidden anim-slide d2">
            <div className="px-4 py-3 border-b-2 border-text flex items-center justify-between">
              <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('summary.errorTypes')}</span>
              {topError && (
                <span className="text-[10px] font-extrabold bg-surface-alt border border-text px-2 py-0.5 rounded-sm text-text-secondary">
                  {t(`err.${topError[0]}`)}
                </span>
              )}
            </div>
            {summary.total === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-text-muted font-semibold">{t('summary.noErrors')}</p>
              </div>
            ) : (
              <div className="space-y-2 px-4 py-3">
                {summary.by_concept.map((c) => {
                  const acc = c.correct + c.partial + c.wrong > 0
                    ? Math.round((c.correct / (c.correct + c.partial + c.wrong)) * 100) : 0;
                  return (
                    <div key={c.concept_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-text truncate mr-2">{c.concept_name}</span>
                        <span className="text-xs font-extrabold text-text shrink-0">{acc}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-alt border border-text rounded-sm overflow-hidden flex">
                        <div className="h-full bg-text" style={{ width: `${(c.correct / Math.max(1, c.correct + c.partial + c.wrong)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(summary.error_types).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(summary.error_types).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
                      <span key={key} className="text-[10px] font-bold bg-surface-alt border border-text rounded-sm px-2 py-0.5 text-text-secondary uppercase">
                        {t(`err.${key}`)} ×{n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between anim-slide d3">
            <span className="text-[10px] font-bold text-text-muted hidden sm:block">
              {t('summary.shortcut', { keys: '1 2 3 · Enter' })}
            </span>
            <button onClick={() => navigate('/home')} className="btn btn-primary px-8 py-3 font-bold text-sm rounded-sm">
              {t('summary.done')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-text rounded-sm flex items-center justify-center shadow-[3px_3px_0_#555] anim-bounce">
          <span className="text-xl font-extrabold text-white">C</span>
        </div>
        <div className="loading text-text-muted text-sm font-bold">
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-20 h-20 bg-text rounded-sm flex items-center justify-center shadow-[5px_5px_0_#555] anim-bounce">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-text">{t('session.completeTitle')}</p>
          <p className="text-sm text-text-secondary font-semibold mt-1">
            {t('session.completeSub', { what: plural(questionCount, 'word.question') })}
          </p>
        </div>
        <button onClick={() => navigate('/home')} className="btn btn-primary px-8 py-3 font-bold text-sm rounded-sm">
          {t('session.objective')}
        </button>
      </div>
    );
  }

  const actLabel = t(`act.${activity?.activity_type}`) || activity?.activity_type?.replace(/_/g, ' ') || '';
  const feedbackMsg = attempt?.correct === 1
    ? t(`enc.${Math.floor(Math.random() * 5) + 1}`)
    : attempt?.correct === 0
    ? t(`str.${Math.floor(Math.random() * 4) + 1}`) : '';

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-text-muted hover:text-red transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="flex-1 h-2.5 bg-surface-alt border border-text rounded-full overflow-hidden">
            <div className="h-full bg-text rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(100, questionCount * 15)}%` }} />
          </div>
          <span className="text-xs font-extrabold text-text w-8 text-right">{questionCount}</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-6 flex flex-col">
        <div className="flex items-center gap-2 mb-5 anim-fade">
          <span className="text-xs font-bold text-text bg-surface-alt border border-text px-2.5 py-1 rounded-sm uppercase">{actLabel}</span>
          <span className="text-xs font-semibold text-text-muted">{content.concept_name || ''}</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-5 anim-fade">
            <h2 className="text-lg sm:text-xl font-extrabold text-text leading-snug">{content.question}</h2>

            {content.worked_example && !attempt && (
              <div className="card rounded-sm p-4 anim-slide">
                <button onClick={() => setShowWorkedExample(!showWorkedExample)}
                  className="text-xs font-bold text-text hover:underline">
                  {showWorkedExample ? t('session.workedHide') : t('session.workedShow')}
                </button>
                {showWorkedExample && (
                  <div className="mt-3 space-y-3 text-sm border-t-2 border-text pt-3">
                    <p className="font-mono text-xs bg-surface-alt border border-text rounded-sm p-3">{content.worked_example.problem}</p>
                    {content.worked_example.steps.slice(0, stepIndex + 1).map((s, i) => (
                      <div key={i} className="anim-fade">
                        <p className="font-bold text-text">{s.step}</p>
                        <p className="text-xs text-text-muted mt-0.5">{s.reasoning}</p>
                      </div>
                    ))}
                    {stepIndex < content.worked_example.steps.length - 1 ? (
                      <button onClick={() => setStepIndex((i) => i + 1)} className="text-xs font-bold text-text pt-1 hover:underline">{t('session.nextStep')}</button>
                    ) : (
                      <p className="text-sm font-bold text-text font-mono pt-1">= {content.worked_example.result}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!attempt && content.options ? (
              <div className="space-y-2.5 anim-slide">
                {content.options.map((opt, i) => (
                  <button key={i} onClick={() => setSelectedOption(i)}
                    className={`w-full text-left px-4 py-3.5 rounded-sm border-2 border-text font-bold text-sm flex items-center gap-3 transition-all duration-150 ${
                      selectedOption === i
                        ? 'bg-text text-white shadow-[3px_3px_0_#555]'
                        : 'bg-white text-text shadow-[4px_4px_0_#111] hover:shadow-[5px_5px_0_#111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#111] active:translate-x-[3px] active:translate-y-[3px]'
                    }`}>
                    <span className={`w-7 h-7 rounded-sm flex items-center justify-center text-xs font-extrabold shrink-0 border ${
                      selectedOption === i ? 'border-white bg-white/20 text-white' : 'border-text bg-surface-alt text-text'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : !attempt ? (
              <div className="anim-slide">
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t('session.answerPlaceholder')} rows={3} autoFocus
                  className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm resize-none" />
              </div>
            ) : null}

            {hints.length > 0 && !attempt && (
              <div className="space-y-2 anim-slide">
                {hints.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-surface-alt border border-text rounded-sm px-4 py-3 shadow-[3px_3px_0_#555] anim-fade">
                    <span className="text-sm mt-0.5">💡</span>
                    <p className="text-sm font-bold text-text">{h}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 pb-3 mt-4 border-t-2 border-text">
          {!attempt ? (
            <div className="flex items-center justify-between">
              <button onClick={loadHint} className="text-xs font-bold text-text-muted hover:text-text px-3 py-2 hover:bg-surface-alt rounded-sm transition-colors">💡 {t('session.hint')}</button>
              <button onClick={handleSubmit}
                disabled={submitting || (!answer.trim() && selectedOption === null)}
                className="btn btn-primary px-8 py-3 font-bold text-sm rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none">
                {submitting ? '...' : t('session.check')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 anim-slide">
              <div className={`rounded-sm px-4 py-3 border-2 ${
                attempt.correct === 1 ? 'border-text bg-correct-ghost' :
                attempt.correct === 2 ? 'border-text-muted bg-partial-ghost' :
                'border-red bg-wrong-ghost'
              }`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">{attempt.correct === 1 ? '✅' : attempt.correct === 2 ? '◐' : '❌'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-text mb-0.5">{feedbackMsg}</p>
                    <p className="text-sm font-bold text-text leading-relaxed">{attempt.feedback}</p>
                    {attempt.error_type && (
                      <p className="text-[11px] font-bold text-text-muted mt-1.5 uppercase">{t(`err.${attempt.error_type}`)}</p>
                    )}
                  </div>
                </div>
              </div>
              {content.explanation && <p className="text-sm font-semibold text-text-secondary leading-relaxed">{content.explanation}</p>}
              <button onClick={loadNext} className="btn btn-primary w-full py-3.5 font-bold text-sm rounded-sm">{t('session.continue')}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}