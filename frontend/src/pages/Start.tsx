import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function Start() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [name, setName] = useState('');

  const start = async () => {
    if (name.trim()) {
      try { await api.updateSettings({ name: name.trim() }); } catch {}
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-md space-y-8 text-center anim-fade">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-text rounded-sm flex items-center justify-center shadow-[5px_5px_0_#555] anim-bounce">
            <span className="text-4xl font-extrabold text-white">C</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-text tracking-tight">COGNIS</h1>
          <p className="text-sm font-semibold text-text-secondary leading-relaxed">{t('brand.tagline')}</p>
        </div>

        <div className="space-y-3 anim-slide d2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
            placeholder={t('landing.namePlaceholder')}
            className="input w-full px-5 py-3.5 text-sm font-bold text-text placeholder-text-muted rounded-sm text-center"
            autoFocus
          />
          <button onClick={start} className="btn btn-primary w-full py-3.5 font-bold text-sm rounded-sm">
            {name.trim() ? t('landing.go', { name }) : t('landing.skip')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 anim-slide d3">
          {[
            { emoji: '🧩', labelKey: 'landing.stepDecompose', descKey: 'landing.stepDecompose.desc' },
            { emoji: '🧠', labelKey: 'landing.stepLearn', descKey: 'landing.stepLearn.desc' },
            { emoji: '📊', labelKey: 'landing.stepTrack', descKey: 'landing.stepTrack.desc' },
          ].map((item) => (
            <div key={item.labelKey} className="card px-3 py-4 rounded-sm">
              <div className="text-2xl mb-2">{item.emoji}</div>
              <div className="text-xs font-extrabold text-text">{t(item.labelKey)}</div>
              <div className="text-[10px] font-semibold text-text-muted mt-0.5">{t(item.descKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}