import React from 'react';
import { useLang, Lang } from '../i18n/LanguageContext';

export const LanguageSwitch: React.FC = () => {
  const { lang, setLang, t } = useLang();
  const opts: { id: Lang; label: string; name: string }[] = [
    { id: 'vi', label: 'VI', name: 'Tiếng Việt' },
    { id: 'en', label: 'EN', name: 'English' },
  ];
  return (
    <div role="group" aria-label={t('language')} className="inline-flex rounded-lg border border-line bg-white p-0.5 text-xs font-semibold">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setLang(o.id)}
          aria-pressed={lang === o.id}
          title={o.name}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${lang === o.id ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};
