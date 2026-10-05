import React, { useMemo, useState } from 'react';
import { Bell, Search, CalendarClock, ShieldCheck, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/LanguageContext';
import { Exam, Announcement, ExamAssignment, HomeSettings } from '../types/exam';
import { ExamCard } from '../components/ExamCard';
import { CURRENT_SCHOOL_YEAR } from '../data/mockExams';
import { pick } from '../data/homeSettings';

interface HomePageProps {
  exams: Exam[];
  announcements: Announcement[];
  assignments?: ExamAssignment[];
  onSelectExam: (exam: Exam) => void;
  onNavigateTeacherAdmin: () => void;
  settings: HomeSettings;
  onEditHome?: () => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void; // editing now lives in the admin area
}

/** Subject-neutral summary of the library (works for any subject or exam structure). */
const ExamOverview: React.FC<{ exams: Exam[] }> = ({ exams }) => {
  const { t } = useLang();
  const totalQ = exams.reduce((n, e) => n + (e.questions.length || e.totalQuestions || 0), 0);
  const avg = exams.length ? Math.round(exams.reduce((n, e) => n + e.durationMinutes, 0) / exams.length) : 0;
  const counts: Record<string, number> = {};
  exams.forEach((e) => { counts[e.subject] = (counts[e.subject] || 0) + 1; });
  const bySubject = Object.entries(counts);
  const stats: [string, string | number][] = [[t('papersN'), exams.length], [t('totalQ'), totalQ], [t('avgTime'), t('minShort', { n: avg })]];
  return (
    <div className="bg-white border border-line rounded-2xl p-5 sm:p-6 w-full max-w-md">
      <div className="text-sm font-bold text-ink mb-4">{t('overview')}</div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-brand-soft py-4">
            <dd className="text-2xl font-extrabold text-brand">{v}</dd>
            <dt className="text-xs text-ink-2 mt-0.5">{l}</dt>
          </div>
        ))}
      </dl>
      {bySubject.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-ink-2 mb-2">{t('bySubject')}</div>
          <div className="flex flex-wrap gap-2">
            {bySubject.map(([name, n]) => (
              <span key={name} className="px-3 py-1 rounded-full border border-line text-sm font-semibold text-ink">
                {name} <span className="text-ink-2 font-normal">· {n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const subjectsOf = (exams: Exam[]) => exams.map((e) => e.subject);

export const HomePage: React.FC<HomePageProps> = ({ exams, announcements, assignments = [], onSelectExam, onNavigateTeacherAdmin, settings, onEditHome }) => {
  const { user, role, openStudentModal, openTeacherModal } = useAuth();
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const myClass = user?.classGroup?.toLowerCase().replace(/^lớp\s*/, '').trim();
  const myAssignments = useMemo(
    () => (myClass ? assignments.filter((a) => a.classGroup.toLowerCase().replace(/^lớp\s*/, '').trim() === myClass) : []),
    [assignments, myClass]
  );
  const assignedIds = useMemo(() => new Set(myAssignments.map((a) => a.examId)), [myAssignments]);

  const activeFilter = filter === 'all' || filter === 'assigned' || subjectsOf(exams).includes(filter.slice(2)) ? filter : 'all';
  const shown = exams.filter((e) => {
    const q = query.trim().toLowerCase();
    if (q && !`${e.title} ${e.code}`.toLowerCase().includes(q)) return false;
    if (activeFilter === 'assigned') return assignedIds.has(e.id);
    if (activeFilter.startsWith('s:')) return e.subject === activeFilter.slice(2);
    return true;
  });

  const hasAside = myAssignments.length > 0 || settings.showNews;
  const subjects = Array.from(new Set(exams.map((e) => e.subject).filter(Boolean)));
  const filters: { id: string; label: string }[] = [
    { id: 'all', label: t('fAll') }, { id: 'assigned', label: t('fAssigned') },
    ...(subjects.length > 1 ? subjects.map((name) => ({ id: `s:${name}`, label: name })) : []),
  ];

  return (
    <div className="flex-1">
      <section className="bg-white border-b border-line">
        <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid ${settings.showStructure ? 'lg:grid-cols-[1.2fr_1fr]' : ''} gap-10 items-center`}>
          <div>
            <p className="text-sm font-semibold text-brand mb-3">{pick(settings.eyebrow, lang, t('schoolYear', { y: CURRENT_SCHOOL_YEAR }))}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink leading-tight tracking-tight max-w-xl">{pick(settings.heroTitle, lang, t('heroTitle'))}</h1>
            <p className="mt-4 text-ink-2 max-w-lg leading-relaxed">{pick(settings.heroSub, lang, t('heroSub'))}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {role === 'guest' && (
                <>
                  <button onClick={openStudentModal} className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand/90 cursor-pointer">{t('studentLogin')}</button>
                  <button onClick={openTeacherModal} className="px-5 py-2.5 rounded-lg border border-line font-semibold text-ink hover:bg-paper cursor-pointer">{t('teacherLogin')}</button>
                </>
              )}
              {role === 'student' && (
                <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm">
                  <div className="font-bold text-ink">{user?.fullName}</div>
                  <div className="text-ink-2">{user?.classGroup} · {t('candidateNo')} {user?.studentId} · {t('readyToTest')}</div>
                </div>
              )}
              {role === 'teacher' && (
                <button onClick={onNavigateTeacherAdmin} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-white font-semibold cursor-pointer">
                  <ShieldCheck className="w-4 h-4" />{t('goAdmin')}
                </button>
              )}
              {role === 'teacher' && onEditHome && (
                <button onClick={onEditHome} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-line font-semibold text-ink hover:bg-paper cursor-pointer">
                  <Pencil className="w-4 h-4" />{t('editHome')}
                </button>
              )}
            </div>
          </div>
          {settings.showStructure && <ExamOverview exams={exams} />}
        </div>
      </section>

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 py-10 grid ${hasAside ? 'lg:grid-cols-[1fr_320px]' : ''} gap-10`}>
        <section aria-labelledby="exams-h">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 id="exams-h" className="text-xl font-bold text-ink">{t('exams')}</h2>
            <label className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-line bg-white focus:border-brand outline-none" />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5" role="tablist">
            {filters.map((f) => (
              <button key={f.id} role="tab" aria-selected={activeFilter === f.id} onClick={() => setFilter(f.id)}
                className={`shrink-0 px-3.5 py-1.5 text-sm font-semibold rounded-full border cursor-pointer transition-colors ${activeFilter === f.id ? 'bg-ink text-white border-ink' : 'bg-white text-ink-2 border-line hover:text-ink'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-ink-2">{t('noExams')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {shown.map((e) => <ExamCard key={e.id} exam={e} onSelectExam={onSelectExam} />)}
            </div>
          )}
        </section>

        {hasAside && <aside className="space-y-8">
          {myAssignments.length > 0 && (
            <section>
              <h2 className="font-bold text-ink mb-3">{t('assigned')}</h2>
              <ul className="space-y-2">
                {myAssignments.map((a) => (
                  <li key={a.id} className="bg-white rounded-xl border border-line p-3.5 text-sm">
                    <div className="font-semibold text-ink">{exams.find((e) => e.id === a.examId)?.title ?? a.examTitle}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                      <span className={a.isRequired ? 'font-semibold text-stamp' : ''}>{a.isRequired ? t('required') : t('practice')}</span>
                      {a.deadline && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{t('dueBy', { d: new Date(a.deadline).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) })}</span>}
                    </div>
                    {a.note && <p className="mt-1.5 text-ink-2">{a.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settings.showNews && (
          <section>
            <h2 className="font-bold text-ink mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-brand" />{t('news')}</h2>
            {announcements.length === 0 ? <p className="text-sm text-ink-2">{t('noNews')}</p> : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className={`bg-white rounded-xl border p-4 ${a.isImportant ? 'border-l-4 border-l-stamp border-line' : 'border-line'}`}>
                    <div className="text-xs text-ink-2 mb-1">{a.date}{a.isImportant && <span className="ml-2 font-semibold text-stamp">{t('important')}</span>}</div>
                    <div className="font-semibold text-ink text-sm leading-snug">{a.title}</div>
                    <p className="mt-1 text-sm text-ink-2 leading-relaxed">{a.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </aside>}
      </div>
    </div>
  );
};
