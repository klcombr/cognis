import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import type { Settings } from '../types';

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' }, { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' }, { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' }, { code: 'hi', label: 'हिन्दी' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [difficulty, setDifficulty] = useState('adaptive');
  const [sessionLength, setSessionLength] = useState('medium');
  const [explanationStyle, setExplanationStyle] = useState('concise');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'profile' | 'ai' | 'learning'>('profile');

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s); setBaseUrl(s.ai_base_url); setModel(s.ai_model);
      setName(s.name); setLanguage(s.language); setDifficulty(s.difficulty_preference);
      setSessionLength(s.session_length); setExplanationStyle(s.explanation_style);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const data: Record<string, string> = {};
      if (apiKey) data.ai_api_key = apiKey;
      if (baseUrl) data.ai_base_url = baseUrl;
      if (model) data.ai_model = model;
      data.name = name; data.language = language;
      data.difficulty_preference = difficulty;
      data.session_length = sessionLength;
      data.explanation_style = explanationStyle;
      const updated = await api.updateSettings(data);
      setSettings(updated); setApiKey(''); setSaved(true);
      window.dispatchEvent(new Event('cognis:settings-changed'));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message || t('settings.saveFailed')); }
    finally { setSaving(false); }
  };

  const handleExport = async () => {
    try {
      const uid = parseInt(localStorage.getItem('cognis_user_id') || '1');
      setExporting(true);
      await api.exportData(uid);
    } catch (e: any) { setError(e.message || t('settings.saveFailed')); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted font-bold">loading...</div>;

  const tabs = [
    { id: 'profile' as const, labelKey: 'settings.tabProfile' },
    { id: 'learning' as const, labelKey: 'settings.tabLearning' },
    { id: 'ai' as const, labelKey: 'settings.tabAi' },
  ];

  const learningSections = [
    { titleKey: 'settings.difficulty', value: difficulty, onChange: setDifficulty as (v: string) => void,
      options: [
        { value: 'adaptive', labelKey: 'diff.adaptive', descKey: 'diff.d.adaptive' },
        { value: 'easy', labelKey: 'diff.easy', descKey: 'diff.d.easy' },
        { value: 'challenging', labelKey: 'diff.challenging', descKey: 'diff.d.challenging' },
      ] },
    { titleKey: 'settings.sessionLength', value: sessionLength, onChange: setSessionLength as (v: string) => void,
      options: [
        { value: 'short', labelKey: 'len.short', descKey: 'len.d.short' },
        { value: 'medium', labelKey: 'len.medium', descKey: 'len.d.medium' },
        { value: 'long', labelKey: 'len.long', descKey: 'len.d.long' },
      ] },
    { titleKey: 'settings.explanationStyle', value: explanationStyle, onChange: setExplanationStyle as (v: string) => void,
      options: [
        { value: 'concise', labelKey: 'style.concise', descKey: 'style.d.concise' },
        { value: 'detailed', labelKey: 'style.detailed', descKey: 'style.d.detailed' },
        { value: 'socratic', labelKey: 'style.socratic', descKey: 'style.d.socratic' },
      ] },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-text sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="text-xs font-bold text-text-muted hover:text-text">← {t('settings.home')}</button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-text rounded-sm flex items-center justify-center shadow-[2px_2px_0_#555]">
              <span className="text-[10px] font-extrabold text-white">C</span>
            </div>
            <span className="text-xs font-extrabold text-text tracking-wide">COGNIS</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <h1 className="text-xl font-extrabold text-text anim-fade">{t('settings.title')}</h1>

        <div className="flex gap-1 border-b-2 border-text anim-fade d1">
          {tabs.map((tabItem) => (
            <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
              className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors ${
                tab === tabItem.id ? 'bg-text text-white' : 'text-text-muted hover:text-text hover:bg-surface-alt'
              }`}>
              {t(tabItem.labelKey)}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-6 anim-fade">
            <section className="space-y-3">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('settings.name')}</h2>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.namePlaceholder')}
                className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm" />
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('settings.language')}</h2>
              <p className="text-xs text-text-muted font-semibold">{t('settings.languageHint')}</p>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button key={lang.code} onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-2.5 text-sm font-bold rounded-sm border-2 border-text transition-all ${
                      language === lang.code
                        ? 'bg-text text-white shadow-[3px_3px_0_#555]'
                        : 'bg-white text-text shadow-[3px_3px_0_#111] hover:shadow-[4px_4px_0_#111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#111] active:translate-x-[2px] active:translate-y-[2px]'
                    }`}>
                    {lang.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'learning' && (
          <div className="space-y-6 anim-fade">
            {learningSections.map((section) => (
              <section key={section.titleKey} className="space-y-3">
                <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t(section.titleKey)}</h2>
                <div className="space-y-2">
                  {section.options.map((opt) => (
                    <button key={opt.value} onClick={() => section.onChange(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-sm border-2 border-text font-bold transition-all ${
                        section.value === opt.value
                          ? 'bg-text text-white shadow-[3px_3px_0_#555]'
                          : 'bg-white text-text shadow-[3px_3px_0_#111] hover:shadow-[4px_4px_0_#111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#111] active:translate-x-[2px] active:translate-y-[2px]'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t(opt.labelKey)}</span>
                        {section.value === opt.value && <span className="text-xs">●</span>}
                      </div>
                      <p className={`text-xs mt-0.5 ${section.value === opt.value ? 'text-white/70' : 'text-text-muted'}`}>{t(opt.descKey)}</p>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-6 anim-fade">
            <section className="space-y-3">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('settings.connection')}</h2>
              <p className="text-xs text-text-muted font-semibold leading-relaxed">{t('settings.connectionHint')}</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted">{t('settings.apiKey')}</label>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={settings?.configured ? '••••••••••••••••' : 'sk-...'}
                    className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm" />
                  {settings?.configured && (
                    <p className="text-xs text-text-muted font-semibold">{t('settings.current')}: {settings.ai_api_key}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted">{t('settings.baseUrl')}</label>
                  <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted">{t('settings.model')}</label>
                  <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="input w-full px-4 py-3 text-sm font-bold text-text placeholder-text-muted rounded-sm" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">{t('settings.presets')}</h2>
              <div className="space-y-2">
                {[
                  { label: 'OpenAI', model: 'gpt-4o-mini', url: 'https://api.openai.com/v1' },
                  { label: 'Groq', model: 'groq/compound-mini', url: 'https://api.groq.com/openai/v1' },
                  { label: 'Anthropic', model: 'claude-3-5-haiku-20241022', url: 'https://api.anthropic.com/v1' },
                  { label: 'Ollama (local)', model: 'llama3.2', url: 'http://localhost:11434/v1' },
                ].map((p) => (
                  <button key={p.label} onClick={() => { setBaseUrl(p.url); setModel(p.model); }}
                    className="w-full text-left px-4 py-3 bg-white border-2 border-text rounded-sm shadow-[3px_3px_0_#111] hover:shadow-[4px_4px_0_#111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-all">
                    <span className="text-sm font-bold text-text">{p.label}</span>
                    <p className="text-xs text-text-muted font-semibold">{p.model}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="pt-4 border-t-2 border-text anim-slide d3">
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={saving}
              className="btn btn-primary px-8 py-3 font-bold text-sm rounded-sm disabled:bg-gray-200 disabled:text-text-muted disabled:border-gray-200 disabled:shadow-none disabled:transform-none">
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
            {saved && <span className="text-xs font-extrabold text-text anim-pop">✓ {t('settings.saved')}</span>}
            {error && <span className="text-xs font-extrabold text-red">{error}</span>}
            <div className="ml-auto text-right">
              <button onClick={handleExport} disabled={exporting}
                className="btn btn-ghost px-5 py-3 text-xs font-bold text-text rounded-sm disabled:opacity-50">
                {exporting ? t('settings.exporting') : `⤓ ${t('settings.export')}`}
              </button>
              <p className="text-[10px] font-semibold text-text-muted mt-1.5">{t('settings.exportHint')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}