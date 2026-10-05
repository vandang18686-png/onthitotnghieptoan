import { Exam, Announcement, Question } from '../types/exam';
import type { Lang } from './LanguageContext';
import { EXAM_EN, ANNOUNCEMENT_EN } from '../data/translations';

/** Returns a copy of the exam in the requested language; untranslated fields keep the Vietnamese text. */
export function localizeExam(exam: Exam, lang: Lang): Exam {
  if (lang === 'vi') return exam;
  const en = exam.en ?? EXAM_EN[exam.id];
  if (!en) return exam;
  const questions: Question[] = exam.questions.map((q) => {
    const tq = en.questions?.[q.id];
    if (!tq) return q;
    return {
      ...q,
      title: tq.title ?? q.title,
      explanation: tq.explanation ?? q.explanation,
      options: q.options?.map((o) => ({ ...o, content: tq.options?.[o.id] ?? o.content })),
      statements: q.statements?.map((s) => ({ ...s, content: tq.statements?.[s.id] ?? s.content })),
    };
  });
  return {
    ...exam, questions,
    title: en.title ?? exam.title, subtitle: en.subtitle ?? exam.subtitle,
    description: en.description ?? exam.description, subject: en.subject ?? exam.subject,
  };
}

export function localizeAnnouncement(a: Announcement, lang: Lang): Announcement {
  if (lang === 'vi') return a;
  const en = a.en ?? ANNOUNCEMENT_EN[a.id];
  return en ? { ...a, title: en.title ?? a.title, content: en.content ?? a.content, author: en.author ?? a.author } : a;
}
