import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Concept } from '../types';

const conceptStatus: Record<string, { labelKey: string; color: string }> = {
  EXPOSED: { labelKey: 'cs.EXPOSED', color: 'bg-surface-alt text-text-secondary border border-text' },
  UNDERSTOOD: { labelKey: 'cs.UNDERSTOOD', color: 'bg-gray-200 text-text border border-text' },
  APPLIED: { labelKey: 'cs.APPLIED', color: 'bg-text text-white' },
  TRANSFERRED: { labelKey: 'cs.TRANSFERRED', color: 'bg-text text-white' },
  CONSOLIDATED: { labelKey: 'cs.CONSOLIDATED', color: 'bg-text text-white' },
};

const nodeFill: Record<string, string> = {
  UNKNOWN: '#ffffff',
  EXPOSED: '#f0f0f0',
  UNDERSTOOD: '#d4d4d4',
  APPLIED: '#111111',
  TRANSFERRED: '#111111',
  CONSOLIDATED: '#111111',
};

const BOX_W = 150;
const BOX_H = 46;
const GAP_X = 70;
const GAP_Y = 18;

export default function TopicView({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { topicId } = useParams<{ topicId: string }>();
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [deps, setDeps] = useState<{ concept_id: number; prerequisite_id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const refresh = async (id: number) => {
    const g = await api.getConceptGraph(id, userId);
    setConcepts(g.concepts);
    setDeps(g.dependencies);
  };

  useEffect(() => {
    if (!topicId) return;
    const id = parseInt(topicId);
    api.getTopic(id, userId).then((tp) => { setTopicName(tp.name); setTopicDesc(tp.description); }).catch(console.error);
    refresh(id).catch(console.error).finally(() => setLoading(false));
  }, [topicId]);

  const startSession = async () => {
    if (!topicId) return;
    setStarting(true);
    try { const s = await api.startSession(userId, parseInt(topicId)); navigate(`/session/${s.id}`); }
    catch {} finally { setStarting(false); }
  };

  const handleDelete = async () => {
    if (!topicId) return;
    setDeleting(true);
    try { await api.deleteTopic(parseInt(topicId)); navigate('/home'); }
    catch {} finally { setDeleting(false); setConfirmDelete(false); }
  };

  const saveEdit = async (c: Concept) => {
    if (!editName.trim() || editName === c.name) { setEditingId(null); return; }
    try { await api.updateConcept(c.id, { name: editName.trim() }); await refresh(parseInt(topicId!)); }
    catch {} finally { setEditingId(null); }
  };

  const removeConcept = async (c: Concept) => {
    try { await api.deleteConcept(c.id); await refresh(parseInt(topicId!)); } catch {}
  };

  const addConcept = async () => {
    if (!newName.trim() || !topicId) return;
    try { await api.createConcept(parseInt(topicId), newName.trim(), ''); setNewName(''); setShowAdd(false); await refresh(parseInt(topicId)); }
    catch {}
  };

  const hasDep = (c: Concept, otherId: number) =>
    deps.some((d) => d.concept_id === c.id && d.prerequisite_id === otherId);

  const togglePrereq = async (c: Concept, otherId: number) => {
    if (!topicId) return;
    try {
      if (hasDep(c, otherId)) await api.removePrerequisite(c.id, otherId);
      else await api.addPrerequisite(c.id, otherId);
      await refresh(parseInt(topicId));
    } catch {}
  };

  const regenerate = async () => {
    if (!topicId) return;
    setRegenerating(true); setConfirmRegen(false);
    try { await api.decomposeTopic(parseInt(topicId), true); await refresh(parseInt(topicId)); }
    catch {}
    finally { setRegenerating(false); }
  };

  const conceptsDone = concepts.filter((c) => ['APPLIED', 'TRANSFERRED', 'CONSOLIDATED'].includes(c.knowledge_level || '')).length;
  const pct = concepts.length > 0 ? Math.round((conceptsDone / concepts.length) * 100) : 0;

  const depths = new Map<number, number>();
  const computeDepths = () => {
    for (const c of concepts) depths.set(c.id, 0);
    let changed = true;
    while (changed) {
      changed = false;
      for (const d of deps) {
        const cur = depths.get(d.concept_id) ?? 0;
        const pr = (depths.get(d.prerequisite_id) ?? 0) + 1;
        if (pr > cur) { depths.set(d.concept_id, pr); changed = true; }
      }
    }
  };
  computeDepths();

  const graphLayers: number[][] = [];
  for (const c of concepts) {
    const depth = depths.get(c.id) ?? 0;
    (graphLayers[depth] ||= []).push(c.id);
  }
  const maxLayer = graphLayers.length;
  const widest = graphLayers.reduce((m, l) => Math.max(m, l.length), 0);
  const graphW = maxLayer * BOX_W + (maxLayer - 1) * GAP_X + 40;
  const graphH = widest * BOX_H + (widest - 1) * GAP_Y + 40;
  const nodePos = new Map<number, { x: number; y: number }>();
  graphLayers.forEach((layer, depth) => {
    layer.forEach((cid, i) => {
      const offset = (widest - layer.length) * (BOX_H + GAP_Y) / 2;
      nodePos.set(cid, {
        x: 20 + depth * (BOX_W + GAP_X),
        y: 20 + offset + i * (BOX_H + GAP_Y),
      });
    });
  });

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-text-muted hover:text-text transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-sm font-extrabold text-text truncate">{topicName || t('topic.defaultTitle')}</h1>
          <div className="ml-auto flex gap-0.5 border-2 border-text rounded-sm shrink-0">
            <button onClick={() => setView('list')}
              className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-colors ${view === 'list' ? 'bg-text text-white' : 'text-text-muted hover:text-text'}`}>
              {t('topic.list')}
            </button>
            <button onClick={() => setView('graph')}
              className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-colors ${view === 'graph' ? 'bg-text text-white' : 'text-text-muted hover:text-text'}`}>
              {t('topic.graph')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <div className="card rounded-sm p-5 anim-fade">
          {topicDesc && <p className="text-sm font-bold text-text-secondary leading-relaxed mb-3">{topicDesc}</p>}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('topic.progress')}</span>
            <span className="text-xs font-extrabold text-text">{pct}%</span>
          </div>
          <div className="h-2.5 bg-surface-alt border border-text rounded-sm overflow-hidden">
            <div className="h-full bg-text transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 loading text-text-muted text-sm font-bold"><span>.</span><span>.</span><span>.</span></div>
        ) : concepts.length === 0 ? (
          <div className="text-center py-12 anim-fade d1">
            <p className="text-sm font-bold text-text">{t('topic.noConcepts')}</p>
            <p className="text-xs text-text-muted font-semibold mt-1">{t('home.newTopicHint')}</p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button onClick={startSession} disabled={starting} className="btn btn-primary px-6 py-3 font-bold text-sm rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:transform-none">
                {starting ? t('topic.starting') : `${t('topic.startSession')} →`}
              </button>
              {!confirmRegen ? (
                <button onClick={() => setConfirmRegen(true)} disabled={regenerating}
                  className="btn btn-ghost px-6 py-3 font-bold text-sm rounded-sm">
                  {t('topic.regenerate')}
                </button>
              ) : (
                <div className="flex items-center gap-2 anim-fade">
                  <button onClick={regenerate} disabled={regenerating} className="btn btn-danger px-4 py-3 text-xs font-bold rounded-sm">
                    {regenerating ? t('topic.regenerating') : t('topic.regenConfirm')}
                  </button>
                  <button onClick={() => setConfirmRegen(false)} className="btn btn-ghost px-4 py-3 text-xs font-bold rounded-sm">{t('topic.cancel')}</button>
                </div>
              )}
            </div>
          </div>
        ) : view === 'graph' ? (
          <div className="card rounded-sm overflow-hidden anim-slide d2">
            <div className="overflow-x-auto p-3">
              <svg width={graphW} height={graphH} viewBox={`0 0 ${graphW} ${graphH}`} className="min-w-full">
                {deps.map((d, i) => {
                  const from = nodePos.get(d.concept_id);
                  const to = nodePos.get(d.prerequisite_id);
                  if (!from || !to) return null;
                  const sx = from.x; const sy = from.y + BOX_H / 2;
                  const ex = to.x + BOX_W; const ey = to.y + BOX_H / 2;
                  const mx = (sx - BOX_W / 2); const my = (sy + ey) / 2;
                  return (
                    <path key={i} d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke="#888" strokeWidth="1.5" strokeDasharray="3 3" />
                  );
                })}
                {concepts.map((c) => {
                  const pos = nodePos.get(c.id);
                  if (!pos) return null;
                  const dark = ['APPLIED', 'TRANSFERRED', 'CONSOLIDATED'].includes(c.knowledge_level || '');
                  const fill = dark ? '#111' : (nodeFill[c.knowledge_level || 'UNKNOWN']);
                  return (
                    <g key={c.id}>
                      <rect x={pos.x} y={pos.y} width={BOX_W} height={BOX_H} rx={4}
                        fill={fill} stroke="#111" strokeWidth="2" />
                      <text x={pos.x + BOX_W / 2} y={pos.y + BOX_H / 2} textAnchor="middle" dominantBaseline="middle"
                        fontSize="12" fontWeight="700" fill={dark ? '#fff' : '#111'}>
                        {c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          <div className="anim-slide d2">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('topic.concepts')}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted">{conceptsDone}/{concepts.length}</span>
                <button onClick={() => setShowAdd((s) => !s)} className="btn btn-ghost px-2.5 py-1 text-[11px] font-bold rounded-sm">
                  + {t('topic.addConcept')}
                </button>
              </div>
            </div>

            {showAdd && (
              <div className="flex gap-2 mb-2.5 anim-fade">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addConcept()}
                  placeholder={t('topic.conceptNamePlaceholder')}
                  className="input flex-1 px-3 py-2 text-sm font-bold text-text placeholder-text-muted rounded-sm" autoFocus />
                <button onClick={addConcept} disabled={!newName.trim()} className="btn btn-primary px-4 py-2 text-xs font-bold rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:transform-none">
                  {t('topic.add')}
                </button>
              </div>
            )}

            <div className="card rounded-sm overflow-hidden divide-y-2 divide-text">
              {concepts.map((c, i) => (
                <div key={c.id} className="px-4 py-3 anim-fade" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === c.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)}
                          className="input w-full px-2 py-1.5 text-sm font-bold text-text rounded-sm" autoFocus />
                      ) : (
                        <p className="text-sm font-bold text-text truncate">{c.name}</p>
                      )}
                      {c.description && <p className="text-xs text-text-muted font-semibold truncate mt-0.5">{c.description}</p>}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-sm shrink-0 ${conceptStatus[c.knowledge_level || ''] ? conceptStatus[c.knowledge_level || '']!.color : 'bg-surface-alt text-text-muted border border-text'}`}>
                      {editingId === c.id ? null : conceptStatus[c.knowledge_level || ''] ? t(conceptStatus[c.knowledge_level || '']!.labelKey) : t('cs.NEW')}
                    </span>
                    {editingId === c.id ? (
                      <button onClick={() => saveEdit(c)} className="btn btn-primary px-2.5 py-1.5 text-[10px] font-extrabold rounded-sm shrink-0">
                        {t('topic.save')}
                      </button>
                    ) : (
                      <button onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                        className="text-text-muted hover:text-text shrink-0 px-1" title={t('topic.edit')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    )}
                    <button onClick={() => removeConcept(c)} className="text-text-muted hover:text-red shrink-0 px-1" title={t('topic.remove')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg>
                    </button>
                  </div>

                  {editingId === c.id && (
                    <div className="mt-3 pt-3 border-t border-border-light anim-fade">
                      <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider mb-1.5">{t('topic.prereqs')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {concepts.filter((o) => o.id !== c.id).map((o) => {
                          const on = hasDep(c, o.id);
                          return (
                            <button key={o.id} onClick={() => togglePrereq(c, o.id)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-sm border-2 border-text transition-all ${on ? 'bg-text text-white shadow-[2px_2px_0_#555]' : 'bg-white text-text hover:bg-surface-alt'}`}>
                              {o.name}
                            </button>
                          );
                        })}
                        {concepts.length <= 1 && <span className="text-[10px] font-semibold text-text-muted">{t('topic.noPrereqs')}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => { setConfirmRegen(true); }}
              className="w-full mt-3 py-3 text-text-muted hover:text-text text-xs font-bold rounded-sm hover:bg-surface-alt transition-colors border-2 border-dashed border-border-light">
              {t('topic.regenerate')}
            </button>
          </div>
        )}

        {confirmRegen && concepts.length > 0 && (
          <div className="card rounded-sm p-4 anim-fade flex items-center gap-3">
            <p className="text-xs font-bold text-text flex-1">{t('topic.regenConfirm')}</p>
            <button onClick={regenerate} disabled={regenerating} className="btn btn-danger px-3 py-2 text-xs font-bold rounded-sm">
              {regenerating ? t('topic.regenerating') : t('topic.regenerate')}
            </button>
            <button onClick={() => setConfirmRegen(false)} className="btn btn-ghost px-3 py-2 text-xs font-bold rounded-sm">{t('topic.cancel')}</button>
          </div>
        )}

        <div className="space-y-2 anim-slide d3">
          <button onClick={startSession} disabled={starting || concepts.length === 0}
            className="btn btn-primary w-full py-3.5 font-bold text-sm rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none">
            {starting ? t('topic.starting') : t('topic.startSession')}
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-3 text-text-muted hover:text-red text-xs font-bold rounded-sm hover:bg-red-ghost transition-colors">
              {t('topic.delete')}
            </button>
          ) : (
            <div className="flex gap-2 anim-fade">
              <button onClick={handleDelete} disabled={deleting}
                className="btn btn-danger flex-1 py-3 text-xs font-bold rounded-sm disabled:opacity-50">
                {deleting ? t('topic.deleting') : t('topic.deleteConfirm')}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost flex-1 py-3 text-xs font-bold rounded-sm">{t('topic.cancel')}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}