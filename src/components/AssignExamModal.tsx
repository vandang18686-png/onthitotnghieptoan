import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  X,
  Send,
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Exam, SchoolClass } from '../types/exam';

interface AssignExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  classes: SchoolClass[];
  preSelectedClass?: SchoolClass | null;
  preSelectedExam?: Exam | null;
  assignedByTeacherName: string;
  onAssign: (data: {
    examId: string;
    classNames: string[];
    deadline?: string;
    note?: string;
    isRequired?: boolean;
  }) => Promise<void>;
  showToast: (msg: string) => void;
}

export const AssignExamModal: React.FC<AssignExamModalProps> = ({
  isOpen,
  onClose,
  exams,
  classes,
  preSelectedClass,
  preSelectedExam,
  assignedByTeacherName,
  onAssign,
  showToast,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [deadlineTime, setDeadlineTime] = useState<string>('23:59');
  const [note, setNote] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (preSelectedExam) {
      setSelectedExamId(preSelectedExam.id);
    } else if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }

    if (preSelectedClass) {
      setSelectedClasses([preSelectedClass.name]);
    } else if (classes.length > 0 && selectedClasses.length === 0) {
      setSelectedClasses([classes[0].name]);
    }

    // Default deadline: 3 days from now at 23:59
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const dateStr = d.toISOString().split('T')[0];
    setDeadlineDate(dateStr);
    setDeadlineTime('23:59');
    setNote(tr('Các em hoàn thành bài làm đúng thời gian quy định.'));
    setIsRequired(true);
    setError('');
  }, [isOpen, preSelectedExam, preSelectedClass]);

  if (!isOpen) return null;

  const toggleClassSelection = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
    setError('');
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map((c) => c.name));
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError(tr('Vui lòng chọn đề kiểm tra cần giao.'));
      return;
    }
    if (selectedClasses.length === 0) {
      setError(tr('Vui lòng chọn ít nhất một lớp học nhận bài.'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let combinedDeadline: string | undefined = undefined;
      if (deadlineDate) {
        combinedDeadline = `${deadlineDate}T${deadlineTime || '23:59'}:00`;
      }

      await onAssign({
        examId: selectedExamId,
        classNames: selectedClasses,
        deadline: combinedDeadline,
        note: note.trim(),
        isRequired,
      });

      showToast(`Đã giao đề thi thành công cho ${selectedClasses.length} lớp (${selectedClasses.join(', ')})!`);
      onClose();
    } catch (err: any) {
      console.error('Error assigning exam:', err);
      setError(err?.message || tr('Không thể giao bài. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const chosenExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-soft to-brand-soft/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{tr('Giao bài thi cho học sinh theo lớp')}</h3>
              <p className="text-xs text-brand">{tr('Học sinh thuộc lớp được giao sẽ nhận thông báo trên trang chủ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Chọn Đề Thi */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-brand" />
              <span>{tr('Chọn đề kiểm tra / bài thi:')}</span>
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              required
            >
              <option value="" disabled>{tr('-- Chọn đề thi --')}</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  [{exam.code}] {exam.title} ({exam.questions.length} câu • {exam.durationMinutes} phút)
                </option>
              ))}
            </select>
            {chosenExam && (
              <div className="mt-1.5 text-[11px] text-slate-500 bg-brand-soft/50 px-3 py-1.5 rounded-lg border border-brand-soft flex items-center justify-between">
                <span>{tr('Môn:')}<strong>{chosenExam.subject}</strong></span>
                <span>{tr('Thời gian làm bài:')}<strong>{chosenExam.durationMinutes} phút</strong></span>
                <span>{tr('Tổng số:')}<strong>{chosenExam.questions.length} câu</strong></span>
              </div>
            )}
          </div>

          {/* 2. Chọn Lớp Học Nhận Bài */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                <span>{tr('Giao cho lớp học (chọn một hoặc nhiều lớp):')}</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllClasses}
                className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
              >
                {selectedClasses.length === classes.length ? tr('Bỏ chọn tất cả') : tr('Chọn tất cả lớp')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {classes.map((c) => {
                const isChecked = selectedClasses.includes(c.name);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleClassSelection(c.name)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isChecked
                        ? 'border-brand bg-brand-soft text-ink font-bold shadow-xs ring-1 ring-brand'
                        : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700 font-medium'
                    }`}
                  >
                    <span>Lớp {c.name}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-brand text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isChecked && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedClasses.length > 0 && (
              <p className="mt-1.5 text-[11px] text-brand font-medium">
                Đã chọn {selectedClasses.length} lớp: <strong>{selectedClasses.join(', ')}</strong>
              </p>
            )}
          </div>

          {/* 3. Hạn Chót Nộp Bài */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand" />
                <span>{tr('Hạn chót nộp bài (Ngày):')}</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand" />
                <span>{tr('Giờ kết thúc:')}</span>
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand transition"
                required
              />
            </div>
          </div>

          {/* 4. Hình Thức Làm Bài & Ghi Chú */}
          <div className="pt-1">
            <label className="block font-bold text-slate-700 mb-1">
              {tr('Yêu cầu bài làm:')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="requirement"
                  checked={isRequired}
                  onChange={() => setIsRequired(true)}
                  className="text-brand focus:ring-brand"
                />
                <span>{tr('Bắt buộc làm (Tính vào điểm chuyên cần / kiểm tra)')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="requirement"
                  checked={!isRequired}
                  onChange={() => setIsRequired(false)}
                  className="text-brand focus:ring-brand"
                />
                <span>{tr('Luyện tập tự do thêm')}</span>
              </label>
            </div>
          </div>

          {/* 5. Lời Dặn Dò / Ghi Chú */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Lời dặn dò / ghi chú của giáo viên:
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tr('VD: Các em làm bài nghiêm túc trong 50 phút, không dùng tài liệu...')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-brand transition"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              {tr('Hủy bỏ')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand hover:bg-brand disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? tr('Đang giao bài...') : tr('Xác nhận giao bài')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
