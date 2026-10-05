import React, { useState } from 'react';
import { Check, RotateCcw, Save } from 'lucide-react';
import { HomeSettings, AccentKey, BiText } from '../types/exam';
import { ACCENTS, DEFAULT_HOME_SETTINGS } from '../data/homeSettings';
import { tr, useLang } from '../i18n/LanguageContext';

interface Props { settings: HomeSettings; onSave: (s: HomeSettings) => Promise<void> }

const input = 'w-full px-3 py-2 text-sm rounded-lg border border-line bg-white focus:border-brand outline-none';

const BiField: React.FC<{ label: string; value: BiText; onChange: (v: BiText) => void; rows?: number }> = ({ label, value, onChange, rows }) => {
  const Tag: any = rows ? 'textarea' : 'input';
  return (
    <div>
      <div className="text-sm font-semibold text-ink mb-1.5">{label}</div>
      <div className="grid sm:grid-cols-2 gap-2">
        {(['vi', 'en'] as const).map((l) => (
          <label key={l} className="block">
            <span className="text-[11px] font-bold text-ink-2 uppercase">{l === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            <Tag rows={rows} className={input} value={value[l]} onChange={(e: any) => onChange({ ...value, [l]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  );
};

export const HomeSettingsTab: React.FC<Props> = ({ settings, onSave }) => {
  const { lang } = useLang();
  const [draft, setDraft] = useState<HomeSettings>(settings);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const set = <K extends keyof HomeSettings>(k: K, v: HomeSettings[K]) => { setDraft((d) => ({ ...d, [k]: v })); setState('idle'); };
  const a = ACCENTS[draft.accent];

  const save = async () => {
    setState('saving');
    try { await onSave(draft); setState('saved'); } catch { setState('error'); }
  };
  const toggles: [keyof HomeSettings, string][] = [
    ['showStructure', tr('Hiện khung tổng quan kho đề')],
    ['showNews', tr('Hiện mục thông báo')],
  ];

  return (
    <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
      <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-ink">{tr('Chỉnh sửa trang chủ')}</h2>
          <p className="text-sm text-ink-2">{tr('Nội dung hiển thị cho học sinh ở trang chủ, hỗ trợ cả tiếng Việt và tiếng Anh.')}</p>
        </div>
        <BiField label={tr('Tên hệ thống')} value={draft.brand} onChange={(v) => set('brand', v)} />
        <BiField label={tr('Tên trường')} value={draft.school} onChange={(v) => set('school', v)} />
        <BiField label={tr('Dòng nhỏ phía trên tiêu đề')} value={draft.eyebrow} onChange={(v) => set('eyebrow', v)} />
        <BiField label={tr('Tiêu đề chính')} value={draft.heroTitle} onChange={(v) => set('heroTitle', v)} rows={2} />
        <BiField label={tr('Mô tả ngắn')} value={draft.heroSub} onChange={(v) => set('heroSub', v)} rows={3} />

        <div>
          <div className="text-sm font-semibold text-ink mb-2">{tr('Màu chủ đạo')}</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
              <button key={k} type="button" onClick={() => set('accent', k)} aria-pressed={draft.accent === k}
                className={`inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer ${draft.accent === k ? 'border-ink text-ink' : 'border-line text-ink-2'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ACCENTS[k].brand }}>
                  {draft.accent === k && <Check className="w-3 h-3 text-white" />}
                </span>
                {ACCENTS[k].name[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {toggles.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={draft[k] as boolean} onChange={(e) => set(k, e.target.checked as any)} className="w-4 h-4 accent-[var(--color-brand)]" />
              {label}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
          <button type="button" onClick={save} disabled={state === 'saving'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold cursor-pointer disabled:opacity-60">
            <Save className="w-4 h-4" />{state === 'saving' ? tr('Đang lưu...') : tr('Lưu trang chủ')}
          </button>
          <button type="button" onClick={() => { setDraft(DEFAULT_HOME_SETTINGS); setState('idle'); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-line text-ink-2 font-semibold cursor-pointer">
            <RotateCcw className="w-4 h-4" />{tr('Khôi phục mặc định')}
          </button>
          {state === 'saved' && <span className="text-sm font-semibold text-brand">{tr('Đã lưu, học sinh thấy ngay.')}</span>}
          {state === 'error' && <span className="text-sm font-semibold text-stamp">{tr('Không lưu được, vui lòng thử lại.')}</span>}
        </div>
      </section>

      <aside className="xl:sticky xl:top-24">
        <div className="text-xs font-bold text-ink-2 uppercase mb-2">{tr('Xem trước')}</div>
        <div className="rounded-2xl border border-line bg-white overflow-hidden" style={{ ['--b' as any]: a.brand }}>
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-ink inline-block" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-ink">{draft.brand[lang] || draft.brand.vi}</div>
              <div className="text-[10px] text-ink-2">{draft.school[lang] || draft.school.vi}</div>
            </div>
          </div>
          <div className="p-5">
            <div className="text-[11px] font-bold mb-1.5" style={{ color: a.brand }}>{draft.eyebrow[lang] || draft.eyebrow.vi}</div>
            <div className="text-lg font-extrabold text-ink leading-tight">{draft.heroTitle[lang] || draft.heroTitle.vi}</div>
            <p className="mt-2 text-xs text-ink-2 leading-relaxed">{draft.heroSub[lang] || draft.heroSub.vi}</p>
            <span className="mt-4 inline-block px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: a.brand }}>{lang === 'vi' ? 'Học sinh đăng nhập' : 'Student sign in'}</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
