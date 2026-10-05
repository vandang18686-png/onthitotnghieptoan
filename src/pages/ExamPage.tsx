import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/LanguageContext';
import {
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
  Sliders,
  Eye,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Hash,
  PenTool,
  Bookmark,
  LogOut,
  Maximize2,
  Minimize2,
  Settings,
} from 'lucide-react';
import { Exam, Question, StudentAnswers, ExamResult } from '../types/exam';
import { MathText, SafeImage } from '../components/MathText';
import { useAuth } from '../context/AuthContext';
import { ScratchPadModal } from '../components/ScratchPadModal';

interface ExamPageProps {
  exam: Exam;
  onBackToHome: () => void;
  onSubmitExam: (result: ExamResult) => void;
}

export const ExamPage: React.FC<ExamPageProps> = ({
  exam,
  onBackToHome,
  onSubmitExam,
}) => {
  const { user } = useAuth();
  const { t } = useLang();

  // Local storage key for exam progress
  const storageKey = `tnthpt_progress_${exam.id}_${user?.id || 'guest'}`;

  // Font size setting (default 16px, range 14px - 22px)
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('tnthpt_font_size');
    return saved ? parseInt(saved, 10) : 16;
  });

  // View mode: 'single' (từng câu) or 'all' (tất cả)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // Active question index (0 to questions.length - 1)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Scratchpad modal
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Confirmation modal for submission
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Remaining time in seconds (e.g. 50 mins = 3000s)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_timer`);
      return saved ? parseInt(saved, 10) : exam.durationMinutes * 60;
    } catch {
      return exam.durationMinutes * 60;
    }
  });

  // Student answers state
  const [answers, setAnswers] = useState<StudentAnswers>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Question bookmarked/marked for review by student
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  // Mobile sidebar toggle
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Auto-save answers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch (e) {
      console.error('Error saving answers to localStorage:', e);
    }
  }, [answers, storageKey]);

  // Timer countdown & auto-submit on 0
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit(); // Auto-submit when time expires
          return 0;
        }
        const updated = prev - 1;
        // Save timer state occasionally
        if (updated % 10 === 0) {
          localStorage.setItem(`${storageKey}_timer`, updated.toString());
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [storageKey]);

  // Save font size
  useEffect(() => {
    localStorage.setItem('tnthpt_font_size', fontSize.toString());
  }, [fontSize]);

  const currentQuestion = exam.questions[currentQuestionIndex] || exam.questions[0];

  // Handlers for answering questions
  const handleSelectMultipleChoice = (questionId: string, optionId: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOption: optionId,
      },
    }));
  };

  const handleSelectTrueFalse = (
    questionId: string,
    statementId: 'a' | 'b' | 'c' | 'd',
    value: boolean
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        statements: {
          ...prev[questionId]?.statements,
          [statementId]: value,
        },
      },
    }));
  };

  const handleShortAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        shortAnswer: value,
      },
    }));
  };

  const toggleBookmark = (questionId: string) => {
    setBookmarkedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Helper check if question is answered
  const isQuestionAnswered = (q: Question): boolean => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.section === 1) {
      return !!ans.selectedOption;
    }
    if (q.section === 2) {
      // Must have answered at least one sub-statement
      return (
        ans.statements !== undefined &&
        Object.keys(ans.statements).some(
          (k) => ans.statements?.[k as 'a' | 'b' | 'c' | 'd'] !== undefined
        )
      );
    }
    if (q.section === 3) {
      return !!ans.shortAnswer && ans.shortAnswer.trim().length > 0;
    }
    return false;
  };

  // Calculate stats for submission modal
  const answeredCount = exam.questions.filter(isQuestionAnswered).length;
  const unansweredCount = exam.questions.length - answeredCount;

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds < 300; // Less than 5 minutes

  // Calculate official Ministry of Education standard score
  const handleFinalSubmit = () => {
    setShowSubmitModal(false);

    let sec1Score = 0;
    let sec1Correct = 0;

    let sec2Score = 0;
    let sec2CorrectItems = 0;

    let sec3Score = 0;
    let sec3Correct = 0;

    exam.questions.forEach((q) => {
      const studentAns = answers[q.id];
      if (!studentAns) return;

      if (q.section === 1 && q.correctOption) {
        if (studentAns.selectedOption === q.correctOption) {
          sec1Score += 0.25;
          sec1Correct += 1;
        }
      } else if (q.section === 2 && q.statements) {
        let correctSubCount = 0;
        q.statements.forEach((st) => {
          const userVal = studentAns.statements?.[st.id];
          if (userVal !== undefined && userVal === st.correctAnswer) {
            correctSubCount += 1;
            sec2CorrectItems += 1;
          }
        });

        // 2025/2026 score table: 1 correct: 0.1; 2 correct: 0.25; 3 correct: 0.5; 4 correct: 1.0
        if (correctSubCount === 1) sec2Score += 0.1;
        else if (correctSubCount === 2) sec2Score += 0.25;
        else if (correctSubCount === 3) sec2Score += 0.5;
        else if (correctSubCount === 4) sec2Score += 1.0;
      } else if (q.section === 3 && q.correctShortAnswer) {
        const cleanUserVal = (studentAns.shortAnswer || '').trim().toLowerCase().replace(',', '.');
        const validList = [
          q.correctShortAnswer.toLowerCase().replace(',', '.'),
          ...(q.acceptedAnswers || []).map((a) => a.toLowerCase().replace(',', '.')),
        ];

        if (validList.includes(cleanUserVal)) {
          sec3Score += 0.5;
          sec3Correct += 1;
        }
      }
    });

    const totalScore = Math.round((sec1Score + sec2Score + sec3Score) * 100) / 100;
    const timeSpent = exam.durationMinutes * 60 - remainingSeconds;

    const result: ExamResult = {
      id: `res-${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: user?.id || 'std-guest',
      studentName: user?.fullName || 'Thí sinh tự do',
      studentClass: user?.classGroup || '12A',
      sbd: user?.studentId || '75001284',
      submittedAt: new Date().toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timeSpentSeconds: timeSpent > 0 ? timeSpent : 1,
      totalScore: Math.min(10.0, totalScore),
      section1Score: Math.round(sec1Score * 100) / 100,
      section2Score: Math.round(sec2Score * 100) / 100,
      section3Score: Math.round(sec3Score * 100) / 100,
      section1CorrectCount: sec1Correct,
      section2CorrectItemsCount: sec2CorrectItems,
      section3CorrectCount: sec3Correct,
      studentAnswers: answers,
    };

    // Clear local storage progress for this exam
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_timer`);

    onSubmitExam(result);
  };

  // Group questions by section for navigation panel
  const section1Questions = exam.questions.filter((q) => q.section === 1);
  const section2Questions = exam.questions.filter((q) => q.section === 2);
  const section3Questions = exam.questions.filter((q) => q.section === 3);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-brand selection:text-white">
      {/* 1. Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo, Exam Code/Title, Back button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm(t('confirmHome'))) {
                  onBackToHome();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-brand bg-slate-100 hover:bg-brand-soft rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('backHome')}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand text-white font-black text-xs flex items-center justify-center shadow-xs">
                {exam.code}
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-ink line-clamp-1">
                  {exam.title}
                </h1>
                <span className="text-[11px] text-slate-500 hidden sm:block">
                  {t('examMeta', { s: exam.subject, n: exam.durationMinutes })}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Student info & Exit */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-800">
                {user?.fullName || t('freeCandidate')}
              </div>
              <div className="text-[11px] text-slate-500">
                {t('classLbl')}: <span className="font-semibold text-slate-700">{user?.classGroup || '12A'}</span> • {t('candidateNo')}: <span className="font-semibold text-brand">{user?.studentId || '75001284'}</span>
              </div>
            </div>

            {/* Mobile Navigation Toggle Button */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden px-3 py-1.5 bg-brand-soft text-brand border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>{t('questionsTime')}</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm(t('confirmExit'))) {
                  onBackToHome();
                }
              }}
              title={t('exitRoom')}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body - 2 Columns (Question section takes 9 cols on xl, sidebar takes 3 cols) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN: QUESTION CONTENT (lg:col-span-8 xl:col-span-9)
           ========================================================================= */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-6">
          {viewMode === 'single' ? (
            /* =================== SINGLE QUESTION VIEW =================== */
            <div className="bg-white rounded-3xl border-2 border-blue-400/90 shadow-xs p-6 sm:p-8 space-y-5 transition-all">
              {/* Question Header Bar */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5 text-brand font-bold text-xs sm:text-sm tracking-wide">
                  <HelpCircle className="w-4 h-4 shrink-0 text-brand" />
                  <span>{t('questionN', { n: currentQuestion.orderNumber })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {currentQuestion.section === 1 && t('sec1Long')}
                    {currentQuestion.section === 2 && t('sec2Long')}
                    {currentQuestion.section === 3 && t('sec3Long')}
                  </span>
                  <button
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      bookmarkedQuestions[currentQuestion.id]
                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                    title={t('flagReview')}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>

              {/* Question Statement with KaTeX */}
              <div
                className="text-ink font-medium leading-relaxed"
                style={{ fontSize: `${fontSize}px` }}
              >
                <MathText content={currentQuestion.title} />
              </div>

              {/* Attached Diagram / Graph / Variation Table */}
              {currentQuestion.imageUrl && !currentQuestion.title.includes(currentQuestion.imageUrl) && (
                <div className="my-3 text-center">
                  <SafeImage
                    src={currentQuestion.imageUrl}
                    alt={currentQuestion.imageCaption || t('figure')}
                  />
                  {currentQuestion.imageCaption && (
                    <p className="text-xs text-slate-500 italic mt-1 font-medium">
                      {currentQuestion.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Section 1: Multiple Choice Options A, B, C, D */}
              {currentQuestion.section === 1 && currentQuestion.options && (
                <div className="space-y-3.5 pt-1">
                  {currentQuestion.options.map((option) => {
                    const isSelected =
                      answers[currentQuestion.id]?.selectedOption === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() =>
                          handleSelectMultipleChoice(currentQuestion.id, option.id)
                        }
                        className={`w-full min-h-[58px] p-4 sm:p-4.5 rounded-2xl border-2 text-left transition-all duration-150 flex items-center gap-4 cursor-pointer ${
                          isSelected
                            ? 'border-brand bg-brand-soft/70 shadow-xs ring-2 ring-blue-100'
                            : 'border-slate-700/80 hover:border-blue-500 hover:bg-paper/60 bg-white'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-brand text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {option.id}
                        </span>

                        <div
                          className="flex-1 overflow-x-auto py-0.5 leading-normal text-ink"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          <MathText content={option.content} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Section 2: True / False Statements a, b, c, d */}
              {currentQuestion.section === 2 && currentQuestion.statements && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600 font-semibold">
                    {t('tfPrompt')}
                  </p>

                  <div className="space-y-2.5">
                    {currentQuestion.statements.map((st) => {
                      const currentAnswer =
                        answers[currentQuestion.id]?.statements?.[st.id];

                      return (
                        <div
                          key={st.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-paper/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 flex-1">
                            <span className="font-bold text-slate-700 text-sm shrink-0 w-6 pt-0.5">
                              {st.id})
                            </span>
                            <div
                              className="flex-1 text-ink leading-relaxed"
                              style={{ fontSize: `${fontSize}px` }}
                            >
                              <MathText content={st.content} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectTrueFalse(currentQuestion.id, st.id, true)
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                currentAnswer === true
                                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                              }`}
                            >
                              {t('true')}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSelectTrueFalse(currentQuestion.id, st.id, false)
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                currentAnswer === false
                                  ? 'bg-red-600 border-red-700 text-white shadow-xs'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                              }`}
                            >
                              {t('false')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3: Short Answer Numeric Input */}
              {currentQuestion.section === 3 && (
                <div className="pt-2 space-y-4">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('shortPrompt')}
                  </label>

                  <div className="max-w-xs">
                    <input
                      type="text"
                      value={answers[currentQuestion.id]?.shortAnswer || ''}
                      onChange={(e) =>
                        handleShortAnswerChange(currentQuestion.id, e.target.value)
                      }
                      placeholder={t('shortPh')}
                      className="w-full px-4 py-3 text-lg font-mono font-bold bg-white border-2 border-blue-400 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-200 focus:border-brand transition"
                    />
                  </div>

                  <div className="text-xs text-slate-500 bg-brand-soft/50 p-3 rounded-xl border border-brand-soft flex items-center gap-2">
                    <Hash className="w-4 h-4 text-brand shrink-0" />
                    <span>
                      {t('shortHint')}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Nav Buttons inside Card */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('prevQ')}</span>
                </button>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('submit')}</span>
                </button>

                <button
                  disabled={currentQuestionIndex === exam.questions.length - 1}
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(exam.questions.length - 1, prev + 1)
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>{t('nextQ')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* =================== ALL QUESTIONS CONTINUOUS SCROLL VIEW =================== */
            <div className="space-y-6">
              <div className="p-4 bg-brand-soft border border-blue-200 rounded-2xl text-xs text-ink flex items-center justify-between">
                <span>
                  {t('viewingAll', { n: exam.questions.length })}
                </span>
                <button
                  onClick={() => setViewMode('single')}
                  className="font-bold underline ml-2 cursor-pointer shrink-0 text-brand hover:text-brand"
                >
                  {t('singleView')}
                </button>
              </div>

              {exam.questions.map((q, idx) => (
                <div
                  key={q.id}
                  id={`question-node-${idx}`}
                  className={`bg-white rounded-3xl border-2 shadow-xs p-6 sm:p-8 space-y-5 transition-all ${
                    currentQuestionIndex === idx
                      ? 'border-blue-500 ring-4 ring-blue-100'
                      : 'border-blue-300/80 hover:border-blue-400'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 text-brand font-bold text-xs sm:text-sm tracking-wide">
                      <HelpCircle className="w-4 h-4 shrink-0 text-brand" />
                      <span>{t('questionN', { n: q.orderNumber })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {q.section === 1 && t('sec1Long')}
                        {q.section === 2 && t('sec2Long')}
                        {q.section === 3 && t('sec3Long')}
                      </span>
                      <button
                        onClick={() => toggleBookmark(q.id)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          bookmarkedQuestions[q.id]
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title={t('flagReview')}
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Question Title */}
                  <div
                    className="text-ink font-medium leading-relaxed"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <MathText content={q.title} />
                  </div>

                  {/* Image */}
                  {q.imageUrl && !q.title.includes(q.imageUrl) && (
                    <div className="my-3 text-center">
                      <SafeImage
                        src={q.imageUrl}
                        alt={q.imageCaption || t('figure')}
                      />
                      {q.imageCaption && (
                        <p className="text-xs text-slate-500 italic mt-1 font-medium">
                          {q.imageCaption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section 1: Options */}
                  {q.section === 1 && q.options && (
                    <div className="space-y-3.5 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.id]?.selectedOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectMultipleChoice(q.id, opt.id)}
                            className={`w-full min-h-[58px] p-4 sm:p-4.5 rounded-2xl border-2 text-left transition-all duration-150 flex items-center gap-4 cursor-pointer ${
                              isSelected
                                ? 'border-brand bg-brand-soft/70 shadow-xs ring-2 ring-blue-100'
                                : 'border-slate-700/80 hover:border-blue-500 hover:bg-paper/60 bg-white'
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-brand text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <div
                              className="flex-1 overflow-x-auto py-0.5 leading-normal text-ink"
                              style={{ fontSize: `${fontSize}px` }}
                            >
                              <MathText content={opt.content} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 2: Statements */}
                  {q.section === 2 && q.statements && (
                    <div className="space-y-2.5 pt-1">
                      {q.statements.map((st) => {
                        const currentAnswer = answers[q.id]?.statements?.[st.id];
                        return (
                          <div
                            key={st.id}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-paper/60 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-start gap-2.5 flex-1">
                              <span className="font-bold text-slate-700 shrink-0 w-6 pt-0.5">
                                {st.id})
                              </span>
                              <div
                                className="flex-1 text-ink leading-relaxed"
                                style={{ fontSize: `${fontSize}px` }}
                              >
                                <MathText content={st.content} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleSelectTrueFalse(q.id, st.id, true)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                  currentAnswer === true
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                                }`}
                              >
                                {t('true')}
                              </button>
                              <button
                                onClick={() => handleSelectTrueFalse(q.id, st.id, false)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                  currentAnswer === false
                                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50'
                                }`}
                              >
                                {t('false')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 3: Short Answer */}
                  {q.section === 3 && (
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">{t('answerLbl')}</span>
                      <input
                        type="text"
                        value={answers[q.id]?.shortAnswer || ''}
                        onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                        placeholder={t('enterValue')}
                        className="px-3 py-2 text-sm font-mono font-bold bg-white border-2 border-blue-400 rounded-xl focus:border-brand focus:outline-none w-48"
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="p-6 bg-white rounded-3xl border-2 border-slate-200 text-center">
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-lg transition cursor-pointer"
                >
                  {t('submitCount', { a: answeredCount, n: exam.questions.length })}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            RIGHT COLUMN: STICKY CONTROL PANEL (lg:col-span-4 xl:col-span-3)
           ========================================================================= */}
        <aside
          className={`lg:col-span-4 xl:col-span-3 space-y-3 lg:sticky lg:top-20 transition-all ${
            isMobileNavOpen
              ? 'fixed inset-x-4 top-20 bottom-4 z-40 overflow-y-auto bg-white p-4 rounded-2xl shadow-2xl border border-slate-300'
              : 'hidden lg:block'
          }`}
        >
          {/* Mobile close button */}
          {isMobileNavOpen && (
            <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <span className="font-bold text-slate-800 text-sm">{t('panelTitle')}</span>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="text-xs font-semibold px-2 py-1 bg-slate-200 rounded-md"
              >
                {t('close')}
              </button>
            </div>
          )}

          {/* 1. DISPLAY CONFIGURATION (Khối Cấu hình hiển thị - Tinh gọn) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('display')}</span>
            </h3>

            {/* Font size control */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-600 font-medium text-[11px]">{t('fontSize')}</span>
              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-paper p-0.5">
                <button
                  onClick={() => setFontSize((prev) => Math.max(13, prev - 1))}
                  className="px-2 py-0.5 text-slate-700 font-bold hover:bg-white rounded transition text-[11px] cursor-pointer"
                  title={t('fontDown')}
                >
                  A-
                </button>
                <span className="w-9 text-center font-bold text-slate-800 font-mono text-[11px]">
                  {fontSize}px
                </span>
                <button
                  onClick={() => setFontSize((prev) => Math.min(22, prev + 1))}
                  className="px-2 py-0.5 text-slate-700 font-bold hover:bg-white rounded transition text-[11px] cursor-pointer"
                  title={t('fontUp')}
                >
                  A+
                </button>
              </div>
            </div>

            {/* View mode toggle: Từng câu / Tất cả */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-600 font-medium text-[11px]">{t('viewLbl')}</span>
              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-paper p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'single'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-600 hover:text-ink bg-transparent'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{t('oneByOne')}</span>
                </button>

                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-600 hover:text-ink bg-transparent'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>{t('allQ')}</span>
                </button>
              </div>
            </div>

            {/* Scratchpad Trigger Button */}
            <button
              onClick={() => setIsScratchpadOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-brand/25 text-brand bg-brand-soft hover:bg-brand/10 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5 text-brand" />
              <span>{t('scratch')}</span>
            </button>
          </div>

          {/* 2. TIMER (Khối Thời gian còn lại - Solid Blue Card Tinh Gọn) */}
          <div
            className={`rounded-2xl p-3.5 sm:p-4 text-center shadow-md transition-all ${
              isLowTime
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-brand text-white'
            }`}
          >
            <div className="text-xs font-medium text-blue-100 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-100" />
              <span>{t('timeLeft')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
              {formatTime(remainingSeconds)}
            </div>
            {isLowTime && (
              <div className="text-[10px] text-white/90 font-medium mt-0.5">
                {t('almostOut')}
              </div>
            )}
          </div>

          {/* 3. QUESTION NAVIGATION GRID (Bảng điều hướng câu hỏi Tinh Gọn) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 space-y-3 max-h-[55vh] overflow-y-auto">
            {/* Section 1: Multiple Choice (5 columns grid) */}
            {section1Questions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-brand rounded-full inline-block"></span>
                    <span className="text-[11px]">{t('p1Nav')}</span>
                  </div>
                  <span className="text-[10px] text-brand font-semibold">
                    {section1Questions.filter(isQuestionAnswered).length}/{section1Questions.length}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {section1Questions.map((q) => {
                    const isAnswered = isQuestionAnswered(q);
                    const globalIdx = exam.questions.findIndex((item) => item.id === q.id);
                    const isCurrent = currentQuestionIndex === globalIdx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIdx);
                          if (viewMode === 'all') {
                            const el = document.getElementById(`question-node-${globalIdx}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          setIsMobileNavOpen(false);
                        }}
                        className={`h-9 sm:h-9.5 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          isCurrent
                            ? 'border-2 border-blue-500 text-brand font-extrabold bg-brand-soft/50'
                            : isAnswered
                            ? 'bg-brand text-white font-bold hover:bg-brand shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400 font-medium'
                        }`}
                      >
                        {q.orderNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: True/False */}
            {section2Questions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-brand rounded-full inline-block"></span>
                    <span className="text-[11px]">{t('p2Nav')}</span>
                  </div>
                  <span className="text-[10px] text-brand font-semibold">
                    {section2Questions.filter(isQuestionAnswered).length}/{section2Questions.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {section2Questions.map((q) => {
                    const globalIdx = exam.questions.findIndex((item) => item.id === q.id);
                    const isCurrent = currentQuestionIndex === globalIdx;
                    const stAnswers = answers[q.id]?.statements || {};

                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIdx);
                          if (viewMode === 'all') {
                            const el = document.getElementById(`question-node-${globalIdx}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          setIsMobileNavOpen(false);
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isCurrent
                            ? 'border-2 border-blue-500 bg-brand-soft/50'
                            : 'border-slate-200 hover:bg-paper'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-800">
                          {t('questionN', { n: q.orderNumber })}
                        </span>

                        <div className="flex items-center gap-1">
                          {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                            const ansVal = stAnswers[letter];
                            return (
                              <span
                                key={letter}
                                className={`w-4.5 h-4.5 rounded-full text-[9px] font-bold flex items-center justify-center border ${
                                  ansVal === true
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : ansVal === false
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white border-slate-300 text-slate-400'
                                }`}
                                title={t('itemN', { l: letter, v: ansVal === true ? t('true') : ansVal === false ? t('false') : t('notChosen') })}
                              >
                                {letter}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Short Answer */}
            {section3Questions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full inline-block"></span>
                    <span className="text-[11px]">{t('p3Nav')}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {section3Questions.filter(isQuestionAnswered).length}/{section3Questions.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {section3Questions.map((q) => {
                    const globalIdx = exam.questions.findIndex((item) => item.id === q.id);
                    const isCurrent = currentQuestionIndex === globalIdx;
                    const val = answers[q.id]?.shortAnswer;

                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIdx);
                          if (viewMode === 'all') {
                            const el = document.getElementById(`question-node-${globalIdx}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          setIsMobileNavOpen(false);
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isCurrent
                            ? 'border-2 border-blue-500 bg-brand-soft/50'
                            : 'border-slate-200 hover:bg-paper'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-800">
                          {t('questionN', { n: q.orderNumber })}
                        </span>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                            val && val.trim().length > 0
                              ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
                              : 'text-slate-400 italic text-[10px]'
                          }`}
                        >
                          {val && val.trim().length > 0 ? val : t('notEntered')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Submit inside nav panel */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('submitCount', { a: answeredCount, n: exam.questions.length })}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* =================== SCRATCHPAD MODAL =================== */}
      <ScratchPadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />

      {/* =================== CONFIRM SUBMISSION MODAL =================== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-ink">
                {t('confirmSubmit')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('afterSubmit')}
              </p>
            </div>

            {/* Stats */}
            <div className="bg-paper rounded-xl p-3 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>{t('answered')}</span>
                <span className="font-bold text-emerald-600">
                  {t('nOfTotal', { a: answeredCount, n: exam.questions.length })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('unanswered')}</span>
                <span className="font-bold text-red-500">
                  {t('nQ', { n: unansweredCount })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t('timeLeft')}:</span>
                <span className="font-bold text-brand">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠️ {t('unfinishedWarn', { n: unansweredCount })}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                {t('keepGoing')}
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {t('confirmSubmitBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
