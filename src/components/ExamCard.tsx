import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Exam } from '../types/exam';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/LanguageContext';

interface ExamCardProps { exam: Exam; onSelectExam: (exam: Exam) => void }

export const PartBar: React.FC<{ s1: number; s2: number; s3: number }> = ({ s1, s2, s3 }) => (
  <div className="flex h-1.5 rounded-full overflow-hidden gap-px" aria-hidden="true">
    <span style={{ flex: s1 }} className="bg-brand" />
    <span style={{ flex: s2 }} className="bg-choice" />
    <span style={{ flex: s3 }} className="bg-short" />
  </div>
);

export const ExamCard: React.FC<ExamCardProps> = ({ exam, onSelectExam }) => {
  const { role, user, results, openStudentModal } = useAuth();
  const { t } = useLang();

  const mine = results.filter((r) => r.examId === exam.id && r.studentId === user?.id);
  const best = mine.length ? Math.max(...mine.map((r) => r.totalScore)) : null;
  const count = (s: 1 | 2 | 3) => exam.questions.filter((q) => q.section === s).length;
  const total = exam.questions.length || exam.totalQuestions || 0;
  const parts = [count(1), count(2), count(3)].filter((n) => n > 0);

  const start = () => {
    if (role === 'guest') return openStudentModal();
    if (role === 'teacher') return;
    onSelectExam(exam);
  };

  return (
    <article className="bg-white rounded-xl border border-line p-5 flex flex-col gap-4 hover:border-brand transition-colors">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="px-2 py-0.5 rounded-md bg-brand-soft text-brand">{t('code', { c: exam.code })}</span>
        <span className="text-ink-2">{exam.subject} {exam.grade}</span>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-ink leading-snug">{exam.title}</h3>
        {exam.subtitle && <p className="mt-1 text-sm text-ink-2 line-clamp-2">{exam.subtitle}</p>}
      </div>

      <div className="space-y-2">
        {parts.length > 1 && <PartBar s1={count(1)} s2={count(2)} s3={count(3)} />}
        <div className="flex justify-between text-xs text-ink-2">
          <span>{t('questions', { n: total })}{parts.length > 1 ? ` (${parts.join(' · ')})` : ''}</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t('minutes', { n: exam.durationMinutes })}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-line">
        <span className="text-xs font-semibold text-ink-2">
          {best !== null ? t('best', { s: best.toFixed(2) }) : t('notTaken')}
        </span>
        <button onClick={start} className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-lg bg-ink text-white hover:bg-brand transition-colors cursor-pointer">
          {best !== null ? t('retry') : t('start')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
};
