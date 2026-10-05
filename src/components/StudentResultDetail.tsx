import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, XCircle, MinusCircle, CircleDot, AlertTriangle, Eye } from 'lucide-react';
import { Exam, ExamResult } from '../types/exam';
import { MathText } from './MathText';
import { tr } from '../i18n/LanguageContext';
import { gradeExam, displayName, QStatus } from '../utils/gradeResult';

interface Props {
  result: ExamResult;
  exam?: Exam;
  onClose: () => void;
}

const STYLE: Record<QStatus, { chip: string; row: string; ink: string; label: string }> = {
  correct: { chip: 'bg-emerald-600 text-white border-emerald-600', row: 'border-line', ink: 'text-emerald-700', label: 'Đúng hoàn toàn' },
  partial: { chip: 'bg-amber-400 text-ink border-amber-400', row: 'border-amber-300 bg-amber-50/40', ink: 'text-amber-700', label: 'Đúng một phần' },
  wrong: { chip: 'bg-rose-600 text-white border-rose-600', row: 'border-rose-300 bg-rose-50/40', ink: 'text-rose-700', label: 'Làm sai' },
  blank: { chip: 'bg-white text-ink-2 border-line', row: 'border-line bg-paper/60', ink: 'text-ink-2', label: 'Bỏ trống' },
};
const ICON: Record<QStatus, React.ReactNode> = {
  correct: <Check className="w-4 h-4" />,
  partial: <CircleDot className="w-4 h-4" />,
  wrong: <XCircle className="w-4 h-4" />,
  blank: <MinusCircle className="w-4 h-4" />,
};

export const StudentResultDetail: React.FC<Props> = ({ result, exam, onClose }) => {
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const graded = useMemo(() => (exam ? gradeExam(exam.questions, result.studentAnswers || {}) : null), [exam, result]);
  const items = graded?.items || [];
  const count = (s: QStatus) => items.filter((i) => i.status === s).length;
  const firstMiss = items.findIndex((i) => i.status !== 'correct');
  const nums = (s: QStatus) => items.filter((i) => i.status === s);
  const scoreChanged = graded && Math.abs(graded.total - result.totalScore) > 0.001;

  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const jump = (id: string) => document.getElementById(`sr-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const partTitle = (s: number) => (s === 1 ? tr('Phần I · Trắc nghiệm') : s === 2 ? tr('Phần II · Đúng / Sai') : tr('Phần III · Trả lời ngắn'));
  const list = items.filter((i) => !onlyMissed || i.status !== 'correct');

  const summaryLine = () => {
    if (!items.length) return '';
    if (firstMiss === -1) return tr('Làm đúng tất cả các câu.');
    if (firstMiss === 0) return tr('Chưa đúng ngay từ câu đầu tiên.');
    return `${tr('Làm đúng liên tiếp đến câu')} ${items[firstMiss - 1].q.orderNumber}, ${tr('bắt đầu chưa đúng ở câu')} ${items[firstMiss].q.orderNumber}.`;
  };

  const chips = (s: QStatus, title: string) =>
    nums(s).length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`font-bold ${STYLE[s].ink}`}>{title}:</span>
        {nums(s).map((i) => (
          <button key={i.q.id} onClick={() => jump(i.q.id)} className="px-2 py-0.5 rounded-md border border-line bg-white font-semibold text-ink hover:border-brand cursor-pointer">
            {i.q.orderNumber}
          </button>
        ))}
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-3 sm:p-6" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-line flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="text-xs font-bold text-brand uppercase tracking-wide">{tr('Bài làm của học sinh')}</div>
            <h2 className="text-xl font-extrabold text-ink leading-tight truncate">{displayName(result.studentName)}</h2>
            <p className="text-sm text-ink-2 mt-0.5">
              {tr('Lớp')} {result.studentClass} · SBD {result.sbd} · {tr('Nộp lúc')} {result.submittedAt}
            </p>
            <p className="text-sm text-ink-2 truncate">{result.examTitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-extrabold text-ink leading-none tabular-nums">{result.totalScore.toFixed(2)}</div>
              <div className="text-[11px] text-ink-2 mt-1">
                {result.section1Score.toFixed(2)} · {result.section2Score.toFixed(2)} · {result.section3Score.toFixed(2)}
              </div>
            </div>
            <button onClick={onClose} aria-label={tr('Đóng')} className="p-2 text-ink-2 hover:text-ink hover:bg-paper rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper space-y-4">
          {!exam && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {tr('Không tìm thấy đề thi tương ứng (đề có thể đã bị xóa) nên chưa thể chấm chi tiết từng câu.')}
            </div>
          )}

          {exam && (
            <>
              {scoreChanged && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {tr('Đáp án của đề đã thay đổi sau khi học sinh nộp bài. Bảng này chấm lại theo đáp án hiện tại nên có thể khác điểm đã lưu.')}
                </div>
              )}

              {/* Summary + map */}
              <section className="bg-white rounded-2xl border border-line p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(['correct', 'partial', 'wrong', 'blank'] as QStatus[]).map((s) => (
                    <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${STYLE[s].row === 'border-line' ? 'border-emerald-200 bg-emerald-50' : STYLE[s].row} ${STYLE[s].ink}`}>
                      {ICON[s]} {tr(STYLE[s].label)}: {count(s)}
                    </span>
                  ))}
                </div>

                <p className="text-sm font-semibold text-ink">{summaryLine()}</p>

                <div>
                  <div className="text-xs font-bold text-ink-2 mb-2">{tr('Bản đồ bài làm')}</div>
                  {[1, 2, 3].map((sec) => {
                    const part = items.filter((i) => i.q.section === sec);
                    if (!part.length) return null;
                    return (
                      <div key={sec} className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="w-24 shrink-0 text-[11px] font-semibold text-ink-2">{partTitle(sec).split('·')[0]}</span>
                        {part.map((i) => (
                          <button
                            key={i.q.id}
                            onClick={() => jump(i.q.id)}
                            title={`${tr('Câu')} ${i.q.orderNumber}: ${tr(STYLE[i.status].label)}`}
                            className={`w-8 h-8 rounded-full border text-xs font-bold cursor-pointer ${STYLE[i.status].chip}`}
                          >
                            {i.q.orderNumber}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  {chips('wrong', tr('Câu sai'))}
                  {chips('partial', tr('Câu đúng một phần'))}
                  {chips('blank', tr('Câu bỏ trống'))}
                </div>
              </section>

              {/* Question by question */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-ink">{tr('Chi tiết từng câu')}</h3>
                <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input type="checkbox" checked={onlyMissed} onChange={(e) => setOnlyMissed(e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
                  {tr('Chỉ hiện câu chưa đúng')}
                </label>
              </div>

              <div className="space-y-2">
                {list.length === 0 && <p className="text-sm text-ink-2 text-center py-6">{tr('Làm đúng tất cả các câu.')}</p>}
                {list.map(({ q, status, points, max }) => {
                  const ans = result.studentAnswers?.[q.id];
                  const expanded = open.has(q.id);
                  return (
                    <div key={q.id} id={`sr-q-${q.id}`} className={`bg-white rounded-xl border p-3.5 ${STYLE[status].row}`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${STYLE[status].chip}`}>{q.orderNumber}</span>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${STYLE[status].ink}`}>
                              {ICON[status]} {tr(STYLE[status].label)}
                            </span>
                            <span className="text-xs font-semibold text-ink-2 tabular-nums">
                              {points.toFixed(2)} / {max.toFixed(2)}
                            </span>
                          </div>

                          {q.section === 1 && (
                            <p className="text-sm text-ink">
                              {tr('Học sinh chọn:')} <b className={status === 'correct' ? 'text-emerald-700' : status === 'wrong' ? 'text-rose-700' : 'text-ink-2'}>{ans?.selectedOption || tr('Không trả lời')}</b>
                              <span className="mx-2 text-line">|</span>
                              {tr('Đáp án đúng:')} <b className="text-emerald-700">{q.correctOption || '–'}</b>
                            </p>
                          )}

                          {q.section === 2 && (
                            <div className="flex flex-wrap gap-2">
                              {(q.statements || []).map((st) => {
                                const v = ans?.statements?.[st.id as 'a' | 'b' | 'c' | 'd'];
                                const ok = v !== undefined && v === st.correctAnswer;
                                const word = (b?: boolean) => (b === undefined ? '–' : b ? tr('Đúng') : tr('Sai'));
                                return (
                                  <span key={st.id} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : v === undefined ? 'border-line bg-paper text-ink-2' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                                    {st.id}) {word(v)}
                                    {!ok && <span className="font-normal"> · {tr('Đáp án đúng:')} {word(st.correctAnswer)}</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {q.section === 3 && (
                            <p className="text-sm text-ink">
                              {tr('Học sinh nhập:')} <b className={`font-mono ${status === 'correct' ? 'text-emerald-700' : status === 'wrong' ? 'text-rose-700' : 'text-ink-2'}`}>{(ans?.shortAnswer || '').trim() || tr('Không trả lời')}</b>
                              <span className="mx-2 text-line">|</span>
                              {tr('Đáp án đúng:')} <b className="font-mono text-emerald-700">{q.correctShortAnswer || '–'}</b>
                            </p>
                          )}

                          <button onClick={() => toggle(q.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                            {expanded ? tr('Ẩn đề bài') : tr('Xem đề bài')}
                          </button>
                          {expanded && (
                            <div className="rounded-lg bg-paper border border-line p-3 text-sm text-ink space-y-2">
                              <MathText content={q.title} />
                              {q.section === 1 &&
                                (q.options || []).map((o) => (
                                  <div key={o.id} className="flex gap-2">
                                    <b className={o.id === q.correctOption ? 'text-emerald-700' : ''}>{o.id}.</b>
                                    <MathText content={o.content} inline />
                                  </div>
                                ))}
                              {q.section === 2 &&
                                (q.statements || []).map((st) => (
                                  <div key={st.id} className="flex gap-2">
                                    <b>{st.id})</b>
                                    <MathText content={st.content} inline />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
