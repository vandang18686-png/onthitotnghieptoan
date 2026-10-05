import { Question, StudentAnswers } from '../types/exam';

export type QStatus = 'correct' | 'partial' | 'wrong' | 'blank';

export interface GradedQuestion {
  q: Question;
  status: QStatus;
  points: number;
  max: number;
}

const norm = (s: string) => s.trim().toLowerCase().replace(',', '.');

/** Same rules as the exam page uses when a paper is submitted. */
export function gradeQuestion(q: Question, ans: StudentAnswers[string] | undefined): GradedQuestion {
  if (q.section === 1) {
    const picked = ans?.selectedOption;
    const ok = !!picked && !!q.correctOption && picked === q.correctOption;
    return { q, status: !picked ? 'blank' : ok ? 'correct' : 'wrong', points: ok ? 0.25 : 0, max: 0.25 };
  }

  if (q.section === 2) {
    const sts = q.statements || [];
    let right = 0;
    let answered = 0;
    sts.forEach((st) => {
      const v = ans?.statements?.[st.id as 'a' | 'b' | 'c' | 'd'];
      if (v !== undefined) answered += 1;
      if (v !== undefined && v === st.correctAnswer) right += 1;
    });
    const points = right === 1 ? 0.1 : right === 2 ? 0.25 : right === 3 ? 0.5 : right === 4 ? 1.0 : 0;
    const status: QStatus = answered === 0 ? 'blank' : right === sts.length && sts.length > 0 ? 'correct' : right === 0 ? 'wrong' : 'partial';
    return { q, status, points, max: 1.0 };
  }

  const typed = (ans?.shortAnswer || '').trim();
  const valid = [q.correctShortAnswer || '', ...(q.acceptedAnswers || [])].filter(Boolean).map(norm);
  const ok = !!typed && valid.includes(norm(typed));
  return { q, status: !typed ? 'blank' : ok ? 'correct' : 'wrong', points: ok ? 0.5 : 0, max: 0.5 };
}

export function gradeExam(questions: Question[], answers: StudentAnswers) {
  const items = questions.map((q) => gradeQuestion(q, answers?.[q.id]));
  const total = Math.round(items.reduce((a, i) => a + i.points, 0) * 100) / 100;
  return { items, total };
}

/** Names typed in lower case ("phạm thị hoàng anh") are shown with capitals. */
export const displayName = (name: string) =>
  name && name === name.toLowerCase() ? name.replace(/(^|\s)(\S)/g, (_, sp: string, ch: string) => sp + ch.toUpperCase()) : name;
