import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ListChecks, Zap } from 'lucide-react';
import { Question } from '../types/exam';
import { tr } from '../i18n/LanguageContext';

interface AnswerKeyTabProps {
  questions: Question[];
  onChange: (next: Question[]) => void;
  /** Open one question in the editor tab. */
  onOpenQuestion: (index: number) => void;
}

type Letter = 'A' | 'B' | 'C' | 'D';
const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

/** "ABCD…" fills in order; "1A 2C 3B" fills by question number. */
export function parseQuickKey(raw: string): { num?: number; letter: Letter }[] {
  const text = raw.toUpperCase();
  const numbered = Array.from(text.matchAll(/(\d+)\s*[-.:)]*\s*([ABCD])/g));
  if (numbered.length) return numbered.map((m) => ({ num: Number(m[1]), letter: m[2] as Letter }));
  return text.replace(/[^ABCD]/g, '').split('').map((l) => ({ letter: l as Letter }));
}

const isMissing = (q: Question) =>
  q.section === 1 ? !q.correctOption : q.section === 3 ? !(q.correctShortAnswer || '').trim() : false;

const Section: React.FC<{ title: string; bar: string; count: number; children: React.ReactNode; extra?: React.ReactNode }> = ({ title, bar, count, children, extra }) => (
  <section className="bg-white rounded-2xl border border-line overflow-hidden">
    <div className={`h-1 ${bar}`} />
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-ink">
          {title} <span className="ml-1 text-xs font-semibold text-ink-2">({count})</span>
        </h4>
        {extra}
      </div>
      {children}
    </div>
  </section>
);

export const AnswerKeyTab: React.FC<AnswerKeyTabProps> = ({ questions, onChange, onOpenQuestion }) => {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [quick, setQuick] = useState('');
  const [quickMsg, setQuickMsg] = useState('');

  const patch = (idx: number, p: Partial<Question>) => onChange(questions.map((q, i) => (i === idx ? { ...q, ...p } : q)));

  const rows = questions.map((q, idx) => ({ q, idx }));
  const part = (s: 1 | 2 | 3) => rows.filter((r) => r.q.section === s);
  const visible = (s: 1 | 2 | 3) => part(s).filter((r) => !onlyMissing || isMissing(r.q));
  const missingCount = questions.filter(isMissing).length;
  const answered = questions.length - missingCount;

  const applyQuick = () => {
    const parsed = parseQuickKey(quick);
    const mc = part(1);
    const next = [...questions];
    let applied = 0;
    parsed.forEach((p, i) => {
      const target = p.num !== undefined ? mc.find((r) => r.q.orderNumber === p.num) : mc[i];
      if (target) {
        next[target.idx] = { ...next[target.idx], correctOption: p.letter };
        applied++;
      }
    });
    onChange(next);
    setQuickMsg(`${tr('Đã cập nhật')} ${applied} ${tr('câu hỏi')}`);
    if (applied) setQuick('');
  };

  const QNum: React.FC<{ q: Question; idx: number }> = ({ q, idx }) => (
    <button
      type="button"
      onClick={() => onOpenQuestion(idx)}
      title={tr('Mở câu này để sửa')}
      className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-brand cursor-pointer shrink-0"
    >
      {isMissing(q) && <AlertCircle className="w-3.5 h-3.5 text-short" aria-label={tr('Chưa có đáp án')} />}
      {tr('Câu')} {q.orderNumber}
    </button>
  );

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-2">
        {tr('Đề chưa có câu hỏi nào.')}
      </div>
    );
  }

  const plain = (s: string) => s.replace(/\$/g, '').slice(0, 120);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-line p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-ink">{tr('Bảng cập nhật đáp án')}</h3>
            <p className="text-sm text-ink-2">
              {tr('Xem và sửa đáp án của toàn bộ câu hỏi tại một nơi. Thay đổi được ghi vào đề ngay, bấm Lưu để cập nhật.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${missingCount ? 'bg-amber-50 text-amber-800' : 'bg-brand-soft text-brand'}`}>
            {missingCount ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {tr('Đã có đáp án')}: {answered}/{questions.length}
          </span>
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
            {tr('Chỉ hiện câu thiếu đáp án')} ({missingCount})
          </label>
        </div>
      </div>

      {onlyMissing && missingCount === 0 && (
        <div className="bg-brand-soft rounded-xl p-4 text-sm font-semibold text-brand">{tr('Không có câu nào thiếu đáp án.')}</div>
      )}

      {part(1).length > 0 && visible(1).length + (onlyMissing ? 0 : 1) > 0 && (
        <Section
          title={tr('Phần I · Trắc nghiệm')}
          bar="bg-brand"
          count={part(1).length}
          extra={
            <div className="flex flex-wrap items-center gap-2">
              <Zap className="w-4 h-4 text-short" />
              <input
                value={quick}
                onChange={(e) => { setQuick(e.target.value); setQuickMsg(''); }}
                onKeyDown={(e) => e.key === 'Enter' && applyQuick()}
                placeholder={tr('Nhập nhanh: ABCDDBCA hoặc 1A 2C 3B')}
                aria-label={tr('Nhập nhanh đáp án')}
                className="w-56 px-3 py-1.5 text-xs font-mono rounded-lg border border-line bg-paper focus:border-brand outline-none"
              />
              <button type="button" onClick={applyQuick} disabled={!quick.trim()}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ink text-white disabled:opacity-40 cursor-pointer">
                {tr('Áp dụng')}
              </button>
              {quickMsg && <span className="text-xs font-semibold text-brand">{quickMsg}</span>}
            </div>
          }
        >
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {visible(1).map(({ q, idx }) => (
              <div key={q.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${isMissing(q) ? 'border-amber-300 bg-amber-50/50' : 'border-line'}`}>
                <QNum q={q} idx={idx} />
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label={`${tr('Câu')} ${q.orderNumber}`}>
                  {LETTERS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={q.correctOption === l}
                      onClick={() => patch(idx, { correctOption: l })}
                      className={`w-8 h-8 rounded-full text-sm font-bold border cursor-pointer transition-colors ${
                        q.correctOption === l ? 'bg-brand border-brand text-white' : 'border-line text-ink-2 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!onlyMissing && part(2).length > 0 && (
        <Section title={tr('Phần II · Đúng / Sai')} bar="bg-choice" count={part(2).length}>
          <div className="grid lg:grid-cols-2 gap-2">
            {part(2).map(({ q, idx }) => (
              <div key={q.id} className="rounded-lg border border-line px-3 py-2.5 space-y-2">
                <QNum q={q} idx={idx} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(q.statements || []).map((st, si) => (
                    <div key={st.id} className="flex items-center justify-between gap-1.5" title={plain(st.content)}>
                      <span className="text-xs font-bold text-ink-2">{st.id})</span>
                      <div className="inline-flex rounded-md border border-line overflow-hidden text-[11px] font-bold">
                        {([true, false] as const).map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            aria-pressed={st.correctAnswer === v}
                            onClick={() => patch(idx, { statements: (q.statements || []).map((s, i) => (i === si ? { ...s, correctAnswer: v } : s)) })}
                            className={`px-2 py-1 cursor-pointer ${
                              st.correctAnswer === v ? (v ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-white text-ink-2 hover:bg-paper'
                            }`}
                          >
                            {v ? tr('Đúng') : tr('Sai')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {part(3).length > 0 && visible(3).length > 0 && (
        <Section title={tr('Phần III · Trả lời ngắn')} bar="bg-short" count={part(3).length}>
          <div className="grid lg:grid-cols-2 gap-2">
            {visible(3).map(({ q, idx }) => (
              <div key={q.id} className={`rounded-lg border px-3 py-2.5 space-y-2 ${isMissing(q) ? 'border-amber-300 bg-amber-50/50' : 'border-line'}`}>
                <div className="flex items-center gap-3">
                  <QNum q={q} idx={idx} />
                  <input
                    value={q.correctShortAnswer || ''}
                    onChange={(e) => patch(idx, { correctShortAnswer: e.target.value })}
                    placeholder={tr('Đáp số')}
                    aria-label={`${tr('Đáp số')} ${tr('Câu')} ${q.orderNumber}`}
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-line bg-white focus:border-brand outline-none"
                  />
                </div>
                <input
                  value={(q.acceptedAnswers || []).join(', ')}
                  onChange={(e) => patch(idx, { acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder={tr('Đáp án chấp nhận khác (cách nhau bằng dấu phẩy)')}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-line bg-paper focus:border-brand outline-none"
                />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};
