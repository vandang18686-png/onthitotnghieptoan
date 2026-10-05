import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  Share2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Exam, ExamResult, Question } from '../types/exam';
import { MathText } from '../components/MathText';
import { formatVietnameseTitle } from '../utils/examUtils';

interface ResultPageProps {
  exam: Exam;
  result: ExamResult;
  onRetakeExam: () => void;
  onBackToHome: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  exam,
  result,
  onRetakeExam,
  onBackToHome,
}) => {
  const [filterPart, setFilterPart] = useState<'all' | 1 | 2 | 3>('all');
  const { t, lang } = useLang();
  const unit = lang === 'vi' ? 'đ' : 'pts';
  const inSection = (n: number) => exam.questions.filter((q) => q.section === n);
  const parts = [
    { n: 1, label: t('partI'), score: result.section1Score, max: inSection(1).length * 0.25, right: result.section1CorrectCount, total: inSection(1).length, u: t('uQ'), bar: 'bg-brand', ink: 'text-brand' },
    { n: 2, label: t('partII'), score: result.section2Score, max: inSection(2).length * 1, right: result.section2CorrectItemsCount, total: inSection(2).reduce((a, q) => a + (q.statements?.length || 4), 0), u: t('uItem'), bar: 'bg-choice', ink: 'text-choice' },
    { n: 3, label: t('partIII'), score: result.section3Score, max: inSection(3).length * 0.5, right: result.section3CorrectCount, total: inSection(3).length, u: t('uQ'), bar: 'bg-short', ink: 'text-short' },
  ].filter((x) => x.total > 0);
  const maxTotal = Math.round(parts.reduce((a, x) => a + x.max, 0) * 100) / 100;
  const roman = ['I', 'II', 'III'];
  const shortName = [t('part1'), t('part2'), t('part3')];
  const rangeOf = (n: number) => {
    const nums = inSection(n).map((q) => q.orderNumber);
    return nums.length ? `${Math.min(...nums)}–${Math.max(...nums)}` : '';
  };
  // The colour of the score panel follows how the paper went
  const tone =
    result.totalScore >= 8 ? { panel: 'bg-emerald-50', ink: 'text-emerald-800', edge: 'border-emerald-200' }
    : result.totalScore >= 6.5 ? { panel: 'bg-brand-soft', ink: 'text-brand', edge: 'border-brand/25' }
    : result.totalScore >= 5 ? { panel: 'bg-amber-50', ink: 'text-amber-800', edge: 'border-amber-200' }
    : { panel: 'bg-rose-50', ink: 'text-rose-700', edge: 'border-rose-200' };
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fire celebratory confetti if score >= 7.0
    if (result.totalScore >= 7.0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [result.totalScore]);

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    exam.questions.forEach((q) => {
      all[q.id] = true;
    });
    setExpandedExplanations(all);
  };

  const collapseAll = () => {
    setExpandedExplanations({});
  };

  const filteredQuestions = exam.questions.filter((q) => {
    if (filterPart === 'all') return true;
    return q.section === filterPart;
  });

  // Calculate score rating
  const getRating = (score: number) => {
    if (score >= 9.0) return { label: t('rExcellent'), color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 8.0) return { label: t('rGood'), color: 'text-brand bg-brand-soft border-brand/25' };
    if (score >= 6.5) return { label: t('rFair'), color: 'text-brand bg-brand-soft border-brand/25' };
    if (score >= 5.0) return { label: t('rAvg'), color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: t('rNeed'), color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const rating = getRating(result.totalScore);

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return t('minSec', { m, s: sec });
  };

  return (
    <div className="min-h-screen bg-paper py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand bg-white border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('backHome')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-paper rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('printResult')}</span>
            </button>
            <button
              onClick={onRetakeExam}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand hover:bg-brand rounded-xl transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('retakeExam')}</span>
            </button>
          </div>
        </div>

        {/* 1. Score summary: compact, the score panel is tinted by the result */}
        <section className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className={`md:w-56 shrink-0 p-5 flex md:flex-col items-center justify-between md:justify-center gap-3 md:text-center ${tone.panel}`}>
            <div>
              <div className={`text-5xl font-extrabold leading-none tabular-nums ${tone.ink}`}>{result.totalScore.toFixed(2)}</div>
              <div className="mt-1.5 text-xs font-semibold text-ink-2">/ {maxTotal} {unit}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white border ${tone.edge} ${tone.ink}`}>
              {t('gradeLbl', { g: rating.label })}
            </span>
          </div>

          <div className="flex-1 min-w-0 p-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              {t('officialResult')}
            </span>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-ink leading-tight">
              {exam.id === result.examId ? exam.title : formatVietnameseTitle(result.examTitle)}
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {t('candidateLine', { n: result.studentName, b: result.sbd, t: result.submittedAt })}
            </p>

            <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3">
              {parts.map((x) => (
                <div key={x.n} className="min-w-0">
                  <dt className="text-xs font-semibold text-ink-2 truncate">{x.label}</dt>
                  <dd className={`mt-0.5 text-base font-extrabold ${x.ink}`}>
                    {x.score.toFixed(2)} <span className="text-xs font-semibold text-ink-2">/ {x.max.toFixed(2)}</span>
                  </dd>
                  <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className={`h-full rounded-full ${x.bar}`} style={{ width: `${x.max ? Math.min(100, (x.score / x.max) * 100) : 0}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-ink-2">{t('correctOf', { a: x.right, n: x.total, u: x.u })}</div>
                </div>
              ))}
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-ink-2">{t('timeSpent')}</dt>
                <dd className="mt-0.5 text-base font-extrabold text-ink flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand" />
                  <span>{formatSeconds(result.timeSpentSeconds)}</span>
                </dd>
                <div className="mt-1 text-[11px] text-ink-2">{t('maxDuration', { n: exam.durationMinutes })}</div>
              </div>
            </dl>
          </div>
        </section>

        {/* 2. Detailed Solutions and Question Review */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" />
                <span>{t('detailTitle')}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t('detailSub')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-paper rounded-lg cursor-pointer"
              >
                {t('openAll')}
              </button>
              <button
                onClick={collapseAll}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-paper rounded-lg cursor-pointer"
              >
                {t('collapse')}
              </button>
            </div>
          </div>

          {/* Filter Pills: built from the parts this paper really has */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'all' as const, label: `${t('allQ')} (${exam.questions.length})` },
              ...parts.map((x) => ({ id: x.n as 1 | 2 | 3, label: `${roman[x.n - 1]} · ${shortName[x.n - 1]} (${rangeOf(x.n)})` })),
            ].map((f) => (
              <button
                key={String(f.id)}
                onClick={() => setFilterPart(f.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterPart === f.id ? 'bg-ink text-white' : 'bg-white border border-line text-ink-2 hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const studentAns = result.studentAnswers[q.id];
              const isExpanded = expandedExplanations[q.id] ?? false;

              // Check correctness
              let isFullyCorrect = false;
              let hasAnswered = false;

              if (q.section === 1) {
                hasAnswered = !!studentAns?.selectedOption;
                isFullyCorrect = studentAns?.selectedOption === q.correctOption;
              } else if (q.section === 2 && q.statements) {
                hasAnswered =
                  studentAns?.statements !== undefined &&
                  Object.keys(studentAns.statements).length > 0;
                isFullyCorrect = q.statements.every(
                  (st) => studentAns?.statements?.[st.id] === st.correctAnswer
                );
              } else if (q.section === 3 && q.correctShortAnswer) {
                const userVal = (studentAns?.shortAnswer || '').trim().toLowerCase().replace(',', '.');
                hasAnswered = userVal.length > 0;
                const accepted = [
                  q.correctShortAnswer.toLowerCase().replace(',', '.'),
                  ...(q.acceptedAnswers || []).map((a) => a.toLowerCase().replace(',', '.')),
                ];
                isFullyCorrect = accepted.includes(userVal);
              }

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden ${
                    isFullyCorrect
                      ? 'border-emerald-200'
                      : hasAnswered
                      ? 'border-red-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-5 py-3.5 flex items-center justify-between border-b ${
                      isFullyCorrect
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : hasAnswered
                        ? 'bg-rose-50/50 border-rose-100'
                        : 'bg-paper border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg uppercase tracking-wide">
                        {t('questionN', { n: q.orderNumber })}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {q.topic || 'Toán học 12'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFullyCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('correct')}
                        </span>
                      ) : hasAnswered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" />
                          {t('wrong')}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
                          {t('skipped')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="p-5 sm:p-6 space-y-4 text-sm text-ink">
                    <div className="leading-relaxed">
                      <MathText content={q.title} />
                    </div>

                    {q.imageUrl && !q.title.includes(q.imageUrl) && (
                      <div className="my-3 text-center">
                        <img
                          src={q.imageUrl}
                          alt={q.imageCaption || t('figIllus')}
                          className="max-h-64 max-w-full mx-auto rounded-xl border border-slate-200 shadow-xs bg-white object-contain"
                        />
                        {q.imageCaption && (
                          <p className="text-xs text-slate-500 italic mt-1 font-medium">
                            {q.imageCaption}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Section 1 Detail */}
                    {q.section === 1 && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {q.options.map((opt) => {
                          const isCorrect = opt.id === q.correctOption;
                          const isStudentSelected = studentAns?.selectedOption === opt.id;

                          let badgeStyle = 'border-slate-200 bg-white text-slate-700';
                          if (isCorrect) {
                            badgeStyle =
                              'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-400 font-semibold';
                          } else if (isStudentSelected && !isCorrect) {
                            badgeStyle =
                              'border-rose-400 bg-rose-50/80 text-rose-950 ring-1 ring-rose-300 line-through';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${badgeStyle}`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isStudentSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <div className="flex-1 overflow-x-auto">
                                <MathText content={opt.content} />
                              </div>
                              {isCorrect && (
                                <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                                  {t('correctAns')}
                                </span>
                              )}
                              {isStudentSelected && !isCorrect && (
                                <span className="text-[11px] font-bold text-rose-700 shrink-0">
                                  {t('yourPick')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Section 2 Detail */}
                    {q.section === 2 && q.statements && (
                      <div className="space-y-2 pt-1">
                        {q.statements.map((st) => {
                          const userChoice = studentAns?.statements?.[st.id];
                          const isCorrect = userChoice === st.correctAnswer;

                          return (
                            <div
                              key={st.id}
                              className="p-3 rounded-xl border border-slate-200 bg-paper/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-start gap-2 flex-1">
                                <span className="font-bold text-slate-700">{st.id})</span>
                                <div className="flex-1">
                                  <MathText content={st.content} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] self-end sm:self-center shrink-0">
                                <span>
                                  {t('yourPickLbl')}{' '}
                                  <strong
                                    className={
                                      userChoice === undefined
                                        ? 'text-slate-400'
                                        : isCorrect
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }
                                  >
                                    {userChoice === true ? t('true') : userChoice === false ? t('false') : t('notChosen')}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  {t('keyLbl')}{' '}
                                  <strong className="text-emerald-700">
                                    {st.correctAnswer ? t('true') : t('false')}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Section 3 Detail */}
                    {q.section === 3 && (
                      <div className="p-3 bg-paper rounded-xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">{t('yourResult')} </span>
                          <strong
                            className={
                              isFullyCorrect
                                ? 'text-emerald-700 font-mono text-sm'
                                : 'text-rose-600 font-mono text-sm'
                            }
                          >
                            {studentAns?.shortAnswer || t('noneEntered')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">{t('keyAns')} </span>
                          <strong className="text-emerald-700 font-mono text-sm">
                            {q.correctShortAnswer}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Toggle Explanation Button */}
                    {q.explanation && (
                      <div className="pt-2">
                        <button
                          onClick={() => toggleExplanation(q.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              <span>{t('hideSol')}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              <span>{t('showSol')}</span>
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-4 bg-brand-soft/50 border border-brand-soft rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed animate-in fade-in duration-150">
                            <div className="font-bold text-ink mb-2 flex items-center gap-1.5">
                              <span>💡 {t('solLbl')}</span>
                            </div>
                            <div className="space-y-2 whitespace-pre-line">
                              <MathText content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
