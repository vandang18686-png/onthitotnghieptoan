import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  X,
  UploadCloud,
  FileDown,
  Info,
  ListChecks,
  Sigma,
  Edit3,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Save,
  HelpCircle,
  Layers,
  Folder,
  Image as ImageIcon,
} from 'lucide-react';
import { Exam, Question, ExamFolder, MultipleChoiceOption } from '../types/exam';
import { MathText } from './MathText';
import { AnswerKeyTab } from './AnswerKeyTab';
import {
  extractTextFromDocx,
  parseQuestionsFromText,
  extractExamMetadata,
} from '../utils/docxUtils';
import { formatQuestionCounts } from '../utils/examUtils';

// Keywords below must stay Vietnamese: they are what the Word parser recognises.
const FORMAT_SAMPLE_P1 = `Câu 1: ...
A. ...
B. ...
C. ...
D. ...
Lời giải: ... Chọn A.`;

const FORMAT_SAMPLE_P2 = `Câu 1: ...
a) ...
b) ... [S]
c) ...
d) ...
Lời giải: ...`;

const FORMAT_SAMPLE_P3 = `Câu 1: ...
Đáp số: 4
Lời giải: ...`;


interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialExam?: Exam | null; // If provided, edit mode. If null, create mode.
  folders: ExamFolder[];
  onSaveExam: (exam: Exam) => void;
}

const SUBJECT_OPTIONS = [
  'Toán học',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lí',
  'Giáo dục kinh tế & pháp luật',
  'Tin học',
];

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen,
  onClose,
  initialExam,
  folders,
  onSaveExam,
}) => {
  const isEditMode = !!initialExam;

  // Active sub-tab in create mode: 'upload' | 'format_guide' | 'manual_editor'
  const [activeTab, setActiveTab] = useState<'upload' | 'format_guide' | 'manual_editor' | 'answer_key'>(
    isEditMode ? 'manual_editor' : 'manual_editor'
  );

  // Exam Metadata
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [subject, setSubject] = useState('Toán học');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [description, setDescription] = useState('');

  // Questions Array
  const [questions, setQuestions] = useState<Question[]>([]);

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsedPreviewQuestions, setParsedPreviewQuestions] = useState<Question[]>([]);

  // Selected question in manual editor (index)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Populate data on open or when initialExam changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialExam) {
      setTitle(initialExam.title);
      setCode(initialExam.code);
      setDurationMinutes(initialExam.durationMinutes);
      setSubject(initialExam.subject);
      setSelectedFolderId(initialExam.folderId || '');
      setDescription(initialExam.description || '');
      setQuestions(initialExam.questions || []);
      setActiveTab('manual_editor');
      setSelectedQuestionIndex(0);
    } else {
      // Create mode initial default
      setTitle('Đề Kiểm Tra Định Kỳ Môn Toán 12');
      setCode(`${Math.floor(100 + Math.random() * 900)}`);
      setDurationMinutes(50);
      setSubject('Toán học');
      setSelectedFolderId(folders[0]?.id || '');
      setDescription('Đề kiểm tra chuẩn cấu trúc 3 phần mới của Bộ GD&ĐT');
      setQuestions([
        {
          id: `q-init-1`,
          section: 1,
          orderNumber: 1,
          type: 'multiple_choice',
          title: 'Trong không gian, cho hình lăng trụ $ABC.A\'B\'C\'$. Khẳng định nào đúng? $\\overrightarrow{A\'B\'} + \\overrightarrow{B\'C\'} = \\overrightarrow{A\'C\'}$',
          options: [
            { id: 'A', content: '$\\overrightarrow{A\'B\'} + \\overrightarrow{B\'C\'} = \\overrightarrow{A\'C\'}$' },
            { id: 'B', content: '$\\overrightarrow{A\'B} + \\overrightarrow{B\'C\'} = \\overrightarrow{A\'C\'}$' },
            { id: 'C', content: '$\\overrightarrow{AA\'} + \\overrightarrow{B\'C\'} = \\overrightarrow{AC}$' },
            { id: 'D', content: '$\\overrightarrow{A\'B\'} - \\overrightarrow{B\'C\'} = \\overrightarrow{A\'C\'}$' },
          ],
          correctOption: 'A',
          explanation: 'Áp dụng quy tắc cộng vector trong tam giác $A\'B\'C\'$.',
          topic: 'Vector không gian',
        },
      ]);
      setActiveTab('upload'); // Default to upload or editor tab
      setSelectedQuestionIndex(0);
    }
  }, [isOpen, initialExam, folders]);

  if (!isOpen) return null;

  // Handle Drag & Drop / File Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);
    setUploadError('');
    setUploadedFileName(file.name);

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        text = await extractTextFromDocx(arrayBuffer);
      } else {
        text = await file.text();
      }

      const parsed = parseQuestionsFromText(text);
      if (parsed.length === 0) {
        setUploadError(tr('Không tìm thấy cấu trúc câu hỏi chuẩn (Ví dụ: "Câu 1: ... A. ... B. ..."). Vui lòng kiểm tra lại file mẫu.'));
      } else {
        // Auto-extract metadata from document header
        const meta = extractExamMetadata(text);
        if (meta.code && (!initialExam || !code)) {
          setCode(meta.code);
        }
        if (meta.title && (!initialExam || !title)) {
          setTitle(meta.title);
        }
        if (meta.subject && (!initialExam || !subject)) {
          const matchSub = SUBJECT_OPTIONS.find((s) =>
            meta.subject?.toLowerCase().includes(s.toLowerCase())
          );
          if (matchSub) setSubject(matchSub);
        }

        // Synchronize parsed questions directly into active questions
        setQuestions(parsed);
        setParsedPreviewQuestions(parsed);
        setSelectedQuestionIndex(0);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Lỗi khi đọc file. Vui lòng thử lại với file Word .docx khác.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleApplyParsedQuestions = () => {
    if (parsedPreviewQuestions.length === 0) return;
    setQuestions(parsedPreviewQuestions);
    setActiveTab('manual_editor');
    setSelectedQuestionIndex(0);
  };

  // Add new question
  const handleAddQuestion = (section: 1 | 2 | 3 = 1) => {
    const newOrder = questions.length + 1;
    let newQ: Question;

    if (section === 1) {
      newQ = {
        id: `q-new-${Date.now()}`,
        section: 1,
        orderNumber: newOrder,
        type: 'multiple_choice',
        title: 'Nội dung câu hỏi mới: Cho hàm số $y = f(x)$...',
        options: [
          { id: 'A', content: '$y = 1$' },
          { id: 'B', content: '$y = 2$' },
          { id: 'C', content: '$y = 3$' },
          { id: 'D', content: '$y = 4$' },
        ],
        correctOption: 'A',
        explanation: 'Lời giải chi tiết...',
      };
    } else if (section === 2) {
      newQ = {
        id: `q-new-${Date.now()}`,
        section: 2,
        orderNumber: newOrder,
        type: 'true_false',
        title: 'Xét tính Đúng/Sai của các mệnh đề sau:',
        statements: [
          { id: 'a', content: 'Mệnh đề a...', correctAnswer: true },
          { id: 'b', content: 'Mệnh đề b...', correctAnswer: false },
          { id: 'c', content: 'Mệnh đề c...', correctAnswer: true },
          { id: 'd', content: 'Mệnh đề d...', correctAnswer: false },
        ],
        explanation: 'Lời giải chi tiết...',
      };
    } else {
      newQ = {
        id: `q-new-${Date.now()}`,
        section: 3,
        orderNumber: newOrder,
        type: 'short_answer',
        title: 'Tính giá trị biểu thức $P = ...$',
        correctShortAnswer: '4',
        explanation: 'Lời giải chi tiết...',
      };
    }

    setQuestions((prev) => [...prev, newQ]);
    setSelectedQuestionIndex(questions.length);
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert(tr('Đề thi phải có ít nhất 1 câu hỏi.'));
      return;
    }
    const updated = questions
      .filter((_, idx) => idx !== index)
      .map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestions(updated);
    setSelectedQuestionIndex((prev) => Math.min(prev, updated.length - 1));
  };

  // Move question Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    // Re-assign order numbers
    const reordered = updated.map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestions(reordered);
    setSelectedQuestionIndex(index - 1);
  };

  // Move question Down
  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    setQuestions(reordered);
    setSelectedQuestionIndex(index + 1);
  };

  // Update current question
  const updateCurrentQuestion = (partial: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === selectedQuestionIndex ? { ...q, ...partial } : q))
    );
  };

  // Update option for current question
  const updateCurrentOption = (optId: 'A' | 'B' | 'C' | 'D', content: string) => {
    const currentQ = questions[selectedQuestionIndex];
    if (!currentQ || !currentQ.options) return;

    const newOptions = currentQ.options.map((opt) =>
      opt.id === optId ? { ...opt, content } : opt
    );
    updateCurrentQuestion({ options: newOptions });
  };

  // Save Exam
  const handleSaveExam = () => {
    if (!title.trim()) {
      alert(tr('Vui lòng nhập tên đề kiểm tra.'));
      return;
    }

    const activeQuestions =
      parsedPreviewQuestions.length > 0 && activeTab === 'upload'
        ? parsedPreviewQuestions
        : questions;

    if (activeQuestions.length === 0) {
      alert(tr('Đề kiểm tra cần có ít nhất một câu hỏi.'));
      return;
    }

    const folder = folders.find((f) => f.id === selectedFolderId);

    const savedExam: Exam = {
      id: initialExam?.id || `exam-${Date.now()}`,
      code: code.trim() || '101',
      title: title.trim(),
      subtitle: `Môn ${subject} - Lớp 12`,
      grade: 12,
      subject,
      year: initialExam?.year || '2026-2027',
      durationMinutes: Number(durationMinutes) || 50,
      totalQuestions: activeQuestions.length,
      maxScore: 10.0,
      description: description.trim(),
      createdAt: initialExam?.createdAt || new Date().toISOString().split('T')[0],
      folderId: selectedFolderId,
      folderName: folder?.name,
      questions: activeQuestions,
    };

    onSaveExam(savedExam);
    onClose();
  };

  const currentQ = questions[selectedQuestionIndex] || questions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-line flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-ink truncate">
                {isEditMode ? `${tr('Chỉnh sửa đề thi')}: ${initialExam?.code} · ${initialExam?.title}` : tr('Tạo mới đề kiểm tra')}
              </h2>
              <p className="text-xs text-ink-2">{tr('Soạn trực tiếp hoặc tải lên file Word; công thức hiển thị bằng KaTeX')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={tr('Đóng')}
            className="p-2 text-ink-2 hover:text-ink rounded-lg hover:bg-paper transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 sm:px-5 bg-white border-b border-line flex items-center gap-1 shrink-0 overflow-x-auto" role="tablist">
          {[
            { id: 'manual_editor' as const, icon: Edit3, label: tr('Soạn đề trực tiếp'), badge: questions.length },
            { id: 'answer_key' as const, icon: ListChecks, label: tr('Bảng đáp án'), badge: null },
            { id: 'upload' as const, icon: UploadCloud, label: tr('Tải lên file Word'), badge: parsedPreviewQuestions.length || null },
            { id: 'format_guide' as const, icon: FileText, label: tr('Quy ước định dạng'), badge: null },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-3 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === t.id ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${activeTab === t.id ? 'bg-brand-soft text-brand' : 'bg-paper text-ink-2'}`}>{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper">
          {/* =========================================================================
              TAB A: TẢI LÊN FILE .DOCX
             ========================================================================= */}
          {activeTab === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand border border-brand/25 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Kéo và thả file .docx (hoặc bấm để chọn file)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                    Hệ thống sẽ tự động bóc tách các câu hỏi dạng "Câu 1: ...", 4 đáp án A, B, C, D và công thức Toán học đặt trong dấu $...$.
                  </p>
                </div>

                {/* Upload Zone */}
                <label className="block border-2 border-dashed border-brand/40 hover:border-brand bg-brand-soft/40 hover:bg-brand-soft p-8 rounded-2xl cursor-pointer transition">
                  <input
                    type="file"
                    accept=".docx,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-sm font-bold text-brand">
                    {isProcessingFile
                      ? 'Đang phân tích file .docx...'
                      : uploadedFileName
                      ? `Đã chọn: ${uploadedFileName} (Bấm để chọn file khác)`
                      : 'Chọn file .docx từ máy tính của bạn'}
                  </span>
                  <span className="block text-xs text-slate-400 mt-1">
                    Hỗ trợ file định dạng .docx (Microsoft Word 2007+) hoặc .txt
                  </span>
                </label>

                <div className="pt-3 border-t border-line flex flex-wrap items-center justify-center gap-2 text-xs text-ink-2">
                  <Info className="w-3.5 h-3.5" />
                  <span>{tr('Chưa biết cách soạn file?')}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('format_guide')}
                    className="font-semibold text-brand hover:underline cursor-pointer"
                  >
                    {tr('Xem quy ước định dạng')}
                  </button>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Parsed Questions Preview */}
              {parsedPreviewQuestions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Đã trích xuất thành công {parsedPreviewQuestions.length} câu hỏi từ file!
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded-md">
                          Phần I: {parsedPreviewQuestions.filter((q) => q.section === 1).length} câu
                        </span>
                        <span className="px-2 py-0.5 bg-brand-soft text-ink font-semibold rounded-md">
                          Phần II: {parsedPreviewQuestions.filter((q) => q.section === 2).length} câu
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-md">
                          Phần III: {parsedPreviewQuestions.filter((q) => q.section === 3).length} câu
                        </span>
                        <span className="font-mono font-bold text-brand ml-1">
                          (Định dạng: {formatQuestionCounts(parsedPreviewQuestions)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApplyParsedQuestions}
                        className="px-4 py-2 bg-brand hover:bg-ink text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{tr('Mở trình soạn đề')}</span>
                      </button>
                      <button
                        onClick={handleSaveExam}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{tr('Lưu ngay đề này')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {parsedPreviewQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs transition hover:border-slate-300"
                      >
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-bold">
                              Câu {q.orderNumber}
                            </span>
                            <span className="font-semibold text-slate-600">
                              {q.section === 1 && 'Phần I: Trắc nghiệm 4 lựa chọn'}
                              {q.section === 2 && 'Phần II: Trắc nghiệm Đúng / Sai'}
                              {q.section === 3 && 'Phần III: Trả lời ngắn'}
                            </span>
                          </div>
                          {q.section === 1 && q.correctOption && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                              Đáp án: {q.correctOption}
                            </span>
                          )}
                          {q.section === 3 && q.correctShortAnswer && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded">
                              Đáp số: {q.correctShortAnswer}
                            </span>
                          )}
                        </div>

                        {/* Title with KaTeX and Embedded Images */}
                        <div className="text-slate-900 text-sm leading-relaxed">
                          <MathText content={q.title} />
                        </div>

                        {/* Separate image if present and not embedded in title text */}
                        {q.imageUrl && !q.title.includes(q.imageUrl) && (
                          <div className="my-2.5 text-center">
                            <img
                              src={q.imageUrl}
                              alt={q.imageCaption || 'Hình vẽ minh họa'}
                              className="max-h-60 max-w-full mx-auto rounded-xl border border-slate-200 shadow-xs bg-white object-contain"
                            />
                            {q.imageCaption && (
                              <p className="text-xs text-slate-500 italic mt-1 font-medium">
                                {q.imageCaption}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section 1: Options A, B, C, D */}
                        {q.section === 1 && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt) => {
                              const isCorrect = q.correctOption === opt.id;
                              return (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                      : 'bg-white border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {opt.id}
                                  </span>
                                  <div className="overflow-x-auto">
                                    <MathText content={opt.content} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Section 2: Statements a, b, c, d */}
                        {q.section === 2 && q.statements && (
                          <div className="space-y-1.5 pt-1">
                            {q.statements.map((st) => (
                              <div
                                key={st.id}
                                className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-2"
                              >
                                <div className="flex items-start gap-2 overflow-x-auto">
                                  <span className="font-bold text-brand uppercase shrink-0">
                                    {st.id})
                                  </span>
                                  <div className="text-slate-800">
                                    <MathText content={st.content} />
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                                    st.correctAnswer
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}
                                >
                                  {st.correctAnswer ? tr('Đúng') : 'Sai'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explanation preview if available */}
                        {q.explanation && (
                          <div className="mt-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                            <span className="font-bold shrink-0">{tr('Lời giải:')}</span>
                            <div className="overflow-x-auto">
                              <MathText content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB B: QUY ƯỚC ĐỊNH DẠNG FILE WORD (dùng chung cho mọi môn)
             ========================================================================= */}
          {activeTab === 'format_guide' && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-white rounded-2xl border border-line p-5 sm:p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-ink">{tr('Quy ước định dạng file Word')}</h3>
                  <p className="text-sm text-ink-2 mt-0.5">
                    {tr('Soạn file theo các quy ước dưới đây để hệ thống tự động bóc tách câu hỏi, đáp án và lời giải.')}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { n: 1, icon: Layers, t: tr('Chia phần'), d: tr('Ghi tiêu đề từng phần: PHẦN I, PHẦN II, PHẦN III. Đề chỉ có một dạng câu thì có thể bỏ qua.') },
                  { n: 2, icon: ListChecks, t: tr('Đánh số câu'), d: tr('Mỗi câu bắt đầu bằng "Câu 1:". "Câu 1." và "Bài 1:" cũng được nhận.') },
                  { n: 3, icon: Sigma, t: tr('Công thức'), d: tr('Kẹp công thức giữa hai dấu đô la, ví dụ'), code: String.raw`$x^2 + \sqrt{2x}$` },
                  { n: 4, icon: ImageIcon, t: tr('Hình ảnh'), d: tr('Ảnh chèn trong câu hỏi được giữ lại cùng câu. Nên kiểm tra lại ở bước xem trước.') },
                ].map((c) => (
                  <div key={c.n} className="bg-white rounded-2xl border border-line p-4 flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">{c.n}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <c.icon className="w-4 h-4 text-brand" />
                        {c.t}
                      </div>
                      <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                        {c.d} {c.code && <code className="px-1.5 py-0.5 rounded bg-paper border border-line text-ink">{c.code}</code>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-bold text-ink pt-1">{tr('Cách viết theo từng dạng câu')}</h4>
              <div className="grid lg:grid-cols-3 gap-3">
                {[
                  { bar: 'bg-brand', title: tr('Phần I · Trắc nghiệm'), sample: FORMAT_SAMPLE_P1, note: tr('Đáp án đúng lấy từ cụm "Chọn A" hoặc "Đáp án A" trong lời giải. Không có cụm này thì mặc định là A.') },
                  { bar: 'bg-choice', title: tr('Phần II · Đúng / Sai'), sample: FORMAT_SAMPLE_P2, note: tr('Thêm [S] cuối ý sai. Ý không đánh dấu được tính là Đúng.') },
                  { bar: 'bg-short', title: tr('Phần III · Trả lời ngắn'), sample: FORMAT_SAMPLE_P3, note: tr('Nhận "Đáp số", "Đáp án" hoặc "Kết quả". Số thập phân dùng dấu chấm.') },
                ].map((c) => (
                  <div key={c.title} className="bg-white rounded-2xl border border-line overflow-hidden flex flex-col">
                    <div className={`h-1 ${c.bar}`} />
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div className="text-sm font-bold text-ink">{c.title}</div>
                      <pre className="text-[11px] leading-relaxed font-mono bg-paper border border-line rounded-lg p-3 whitespace-pre-wrap text-ink overflow-x-auto">{c.sample}</pre>
                      <p className="text-xs text-ink-2 leading-relaxed">{c.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-brand-soft rounded-2xl p-4 text-xs text-ink leading-relaxed space-y-1.5">
                <p>{tr('Từ khóa nhận diện (Câu, Lời giải, Đáp số...) cần giữ nguyên tiếng Việt, dù nội dung đề viết bằng ngôn ngữ nào.')}</p>
                <p>{tr('Sau khi tải lên, hãy xem lại danh sách câu ở bước xem trước và chỉnh trong tab Soạn đề trực tiếp.')}</p>
                <button type="button" onClick={() => setActiveTab('upload')} className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand text-white font-semibold rounded-lg cursor-pointer">
                  <UploadCloud className="w-4 h-4" />
                  {tr('Đến trang tải lên')}
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: BẢNG CẬP NHẬT ĐÁP ÁN (xem và sửa đáp án của cả đề tại một nơi)
             ========================================================================= */}
          {activeTab === 'answer_key' && (
            <div className="max-w-6xl mx-auto">
              <AnswerKeyTab
                questions={questions}
                onChange={setQuestions}
                onOpenQuestion={(i) => {
                  setSelectedQuestionIndex(i);
                  setActiveTab('manual_editor');
                }}
              />
            </div>
          )}

          {/* =========================================================================
              TAB C: TRÌNH SOẠN ĐỀ TRỰC TIẾP
             ========================================================================= */}
          {activeTab === 'manual_editor' && (
            <div className="space-y-6">
              {/* Exam Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand" />
                  {tr('Thông tin chung của đề thi')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {tr('Tên đề kiểm tra:')}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={tr('VD: Đề Khảo Sát Toán 12 Học Kỳ 1...')}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {tr('Mã đề:')}
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="101"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Thời gian (phút):
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {tr('Môn học:')}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      {tr('Thư mục lưu trữ:')}
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="">{tr('-- Mặc định (Tất cả) --')}</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Mô tả / Ghi chú:
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={tr('VD: Kiểm tra kiến thức chương Oxyz và Nguyên hàm - Tích phân')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Questions Split Layout: Sidebar + Question Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar: Question Navigator (lg:col-span-3) */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Danh sách ({questions.length} câu)
                    </span>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddQuestion(1)}
                        className="px-2 py-1 bg-brand-soft hover:bg-brand-soft text-brand font-bold rounded-lg text-[11px] transition cursor-pointer"
                        title={tr('Thêm câu trắc nghiệm')}
                      >
                        + TN
                      </button>
                      <button
                        onClick={() => handleAddQuestion(2)}
                        className="px-2 py-1 bg-brand-soft hover:bg-brand-soft text-brand font-bold rounded-lg text-[11px] transition cursor-pointer"
                        title={tr('Thêm câu Đúng/Sai')}
                      >
                        + Đ/S
                      </button>
                      <button
                        onClick={() => handleAddQuestion(3)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        title={tr('Thêm câu trả lời ngắn')}
                      >
                        + TLN
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === selectedQuestionIndex;
                      return (
                        <div
                          key={q.id || idx}
                          onClick={() => setSelectedQuestionIndex(idx)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                            isCurrent
                              ? 'border-brand bg-brand-soft/80 ring-1 ring-brand font-bold text-ink'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] flex items-center justify-center font-black shrink-0">
                              {q.orderNumber}
                            </span>
                            <span className="truncate">
                              {q.section === 1 && 'Trắc nghiệm (Phần I)'}
                              {q.section === 2 && 'Đúng/Sai (Phần II)'}
                              {q.section === 3 && 'Trả lời ngắn (Phần III)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                              title={tr('Chuyển lên')}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === questions.length - 1}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                              title={tr('Chuyển xuống')}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title={tr('Xóa câu')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Area: Single Question Editor with Live KaTeX Preview (lg:col-span-9) */}
                <div className="lg:col-span-9 space-y-4">
                  {currentQ ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-black">
                            CÂU {currentQ.orderNumber}
                          </span>

                          <select
                            value={currentQ.section}
                            onChange={(e) => {
                              const sec = Number(e.target.value) as 1 | 2 | 3;
                              updateCurrentQuestion({
                                section: sec,
                                type:
                                  sec === 1
                                    ? 'multiple_choice'
                                    : sec === 2
                                    ? 'true_false'
                                    : 'short_answer',
                              });
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                          >
                            <option value={1}>{tr('Phần I: Trắc nghiệm 4 lựa chọn')}</option>
                            <option value={2}>{tr('Phần II: Đúng / Sai')}</option>
                            <option value={3}>{tr('Phần III: Trả lời ngắn')}</option>
                          </select>
                        </div>

                        <span className="text-xs text-slate-400">
                          {tr('KaTeX Live Render tức thì')}
                        </span>
                      </div>

                      {/* Question Title Statement */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                            <span>{tr('Nội dung câu hỏi (chứa LaTeX $...$):')}</span>
                            <span className="text-[10px] text-brand font-medium lowercase">
                              (hỗ trợ dán ảnh trực tiếp Ctrl+V)
                            </span>
                          </label>
                          <textarea
                            rows={4}
                            value={currentQ.title}
                            onChange={(e) => updateCurrentQuestion({ title: e.target.value })}
                            onPaste={(e) => {
                              const items = e.clipboardData?.items;
                              if (items) {
                                for (let i = 0; i < items.length; i++) {
                                  if (items[i].type.indexOf('image') !== -1) {
                                    const file = items[i].getAsFile();
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        if (typeof reader.result === 'string') {
                                          updateCurrentQuestion({ imageUrl: reader.result });
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                      e.preventDefault();
                                      break;
                                    }
                                  }
                                }
                              }
                            }}
                            placeholder={tr('Nhập đề bài câu hỏi kèm công thức LaTeX trong dấu $...$')}
                            className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand"
                          />
                        </div>

                        {/* Live KaTeX Preview */}
                        <div>
                          <label className="block text-xs font-bold text-brand uppercase mb-1 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Xem trước hiển thị (KaTeX + Hình vẽ):
                          </label>
                          <div className="p-3 bg-brand-soft/50 border border-brand/25 rounded-xl text-xs sm:text-sm text-slate-900 min-h-[100px] leading-relaxed overflow-x-auto">
                            <MathText content={currentQ.title || '(Chưa nhập nội dung)'} />
                            {currentQ.imageUrl && !currentQ.title.includes(currentQ.imageUrl) && (
                              <div className="mt-2 text-center">
                                <img
                                  src={currentQ.imageUrl}
                                  alt={tr('Hình vẽ câu hỏi')}
                                  className="max-h-48 max-w-full mx-auto rounded-lg border border-brand/25 bg-white object-contain shadow-xs"
                                />
                                {currentQ.imageCaption && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                                    {currentQ.imageCaption}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attached Diagram / Bảng biến thiên / Đồ thị Manager */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-brand" />
                            <span className="text-xs font-bold text-slate-700 uppercase">
                              Hình vẽ minh họa / Bảng biến thiên / Đồ thị
                            </span>
                            {currentQ.imageUrl && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                {tr('Đã có hình')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="px-3 py-1.5 bg-brand hover:bg-brand text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                              <UploadCloud className="w-3.5 h-3.5" />
                              {tr('Tải ảnh từ máy')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      if (typeof reader.result === 'string') {
                                        updateCurrentQuestion({ imageUrl: reader.result });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>

                            {currentQ.imageUrl && (
                              <button
                                type="button"
                                onClick={() => updateCurrentQuestion({ imageUrl: undefined, imageCaption: undefined })}
                                className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {tr('Xóa ảnh')}
                              </button>
                            )}
                          </div>
                        </div>

                        {currentQ.imageUrl ? (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                            <img
                              src={currentQ.imageUrl}
                              alt={tr('Hình vẽ minh họa')}
                              className="max-h-44 max-w-[260px] rounded-lg border border-slate-100 object-contain shadow-xs bg-slate-50 p-1 shrink-0"
                            />
                            <div className="flex-1 w-full space-y-2">
                              <label className="block text-xs font-bold text-slate-600">
                                Chú thích hình vẽ (tùy chọn):
                              </label>
                              <input
                                type="text"
                                value={currentQ.imageCaption || ''}
                                onChange={(e) => updateCurrentQuestion({ imageCaption: e.target.value })}
                                placeholder={tr('Ví dụ: Hình 1. Bảng biến thiên của hàm số f(x)')}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                              />
                              <p className="text-[11px] text-slate-400">
                                {tr('Hình ảnh này sẽ được hiển thị đồng bộ cho thí sinh làm bài thi và trong trang chấm điểm kết quả.')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Chưa có hình vẽ đính kèm cho câu hỏi này. Bạn có thể nhấn nút <strong>{tr('"Tải ảnh từ máy"')}</strong>{tr('hoặc dùng Snipping Tool (Windows + Shift + S) chụp đồ thị/bảng biến thiên rồi nhấn')}<strong>Ctrl + V</strong>{tr('để dán.')}</p>
                        )}
                      </div>

                      {/* Section 1: Options A, B, C, D */}
                      {currentQ.section === 1 && (
                        <div className="space-y-3 pt-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase">
                            4 Phương án A, B, C, D (chọn radio để đánh dấu đáp án đúng):
                          </label>

                          {(['A', 'B', 'C', 'D'] as const).map((optId) => {
                            const opt = currentQ.options?.find((o) => o.id === optId);
                            const isCorrect = currentQ.correctOption === optId;

                            return (
                              <div
                                key={optId}
                                className={`p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center gap-3 transition ${
                                  isCorrect ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="radio"
                                    name={`correct-${currentQ.id}`}
                                    checked={isCorrect}
                                    onChange={() => updateCurrentQuestion({ correctOption: optId })}
                                    className="w-4 h-4 text-emerald-600 cursor-pointer"
                                    title={tr('Đánh dấu đáp án đúng')}
                                  />
                                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">
                                    {optId}
                                  </span>
                                </div>

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    value={opt?.content || ''}
                                    onChange={(e) => updateCurrentOption(optId, e.target.value)}
                                    placeholder={`Nhập phương án ${optId} (hỗ trợ $...$)`}
                                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                                  />
                                </div>

                                {/* KaTeX live preview for option */}
                                <div className="w-full md:w-56 p-1.5 bg-white border border-slate-200 rounded-lg text-xs overflow-x-auto shrink-0">
                                  <MathText content={opt?.content || '...'} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Section 2: True/False */}
                      {currentQ.section === 2 && currentQ.statements && (
                        <div className="space-y-3 pt-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase">
                            4 Mệnh đề a, b, c, d (chọn Đúng/Sai cho từng mệnh đề):
                          </label>

                          {currentQ.statements.map((st, sIdx) => (
                            <div
                              key={st.id}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
                            >
                              <span className="font-bold text-slate-700 w-5">{st.id})</span>
                              <input
                                type="text"
                                value={st.content}
                                onChange={(e) => {
                                  const updatedSts = [...currentQ.statements!];
                                  updatedSts[sIdx] = { ...st, content: e.target.value };
                                  updateCurrentQuestion({ statements: updatedSts });
                                }}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedSts = [...currentQ.statements!];
                                    updatedSts[sIdx] = { ...st, correctAnswer: true };
                                    updateCurrentQuestion({ statements: updatedSts });
                                  }}
                                  className={`px-3 py-1 rounded text-xs font-bold border transition ${
                                    st.correctAnswer
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {tr('Đúng')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedSts = [...currentQ.statements!];
                                    updatedSts[sIdx] = { ...st, correctAnswer: false };
                                    updateCurrentQuestion({ statements: updatedSts });
                                  }}
                                  className={`px-3 py-1 rounded text-xs font-bold border transition ${
                                    !st.correctAnswer
                                      ? 'bg-red-600 text-white border-red-600'
                                      : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                                >
                                  Sai
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Section 3: Short Answer */}
                      {currentQ.section === 3 && (
                        <div className="pt-2 space-y-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase">
                            {tr('Đáp án số chuẩn:')}
                          </label>
                          <input
                            type="text"
                            value={currentQ.correctShortAnswer || ''}
                            onChange={(e) =>
                              updateCurrentQuestion({ correctShortAnswer: e.target.value })
                            }
                            placeholder={tr('VD: 4 hoặc 0.25')}
                            className="w-48 px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl"
                          />
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Lời giải chi tiết (hỗ trợ công thức LaTeX $...$):
                        </label>
                        <textarea
                          rows={3}
                          value={currentQ.explanation || ''}
                          onChange={(e) =>
                            updateCurrentQuestion({ explanation: e.target.value })
                          }
                          placeholder={tr('Nhập phương pháp và các bước giải...')}
                          className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 bg-white border-t border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">{isEditMode ? tr('Chế độ chỉnh sửa đề thi') : tr('Chế độ tạo mới đề thi')}</span>
            <span>·</span>
            <span>{tr('Tổng cộng:')} <strong className="text-ink">{questions.length}</strong> {tr('câu hỏi')}</span>
            <span className="px-2 py-0.5 rounded-md bg-paper border border-line font-mono font-bold text-brand" title={tr('Cấu trúc:')}>{formatQuestionCounts(questions)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-ink-2 hover:text-ink border border-line rounded-lg hover:bg-paper transition cursor-pointer"
            >
              {tr('Hủy bỏ')}
            </button>
            <button
              onClick={handleSaveExam}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand hover:bg-brand/90 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isEditMode ? tr('Lưu Cập Nhật Đề') : tr('Hoàn Tất & Lưu Đề')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
