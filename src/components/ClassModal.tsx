import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, School, AlertCircle } from 'lucide-react';
import { SchoolClass } from '../types/exam';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass?: SchoolClass | null;
  onSaveClass: (schoolClass: SchoolClass) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  onSaveClass,
  showToast,
}) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(12);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialClass) {
      setName(initialClass.name);
      setGrade(initialClass.grade);
      setAcademicYear(initialClass.academicYear || '2026-2027');
      setHomeroomTeacher(initialClass.homeroomTeacher || '');
      setDescription(initialClass.description || '');
    } else {
      setName('');
      setGrade(12);
      setAcademicYear('2026-2027');
      setHomeroomTeacher('');
      setDescription('');
    }
    setError('');
  }, [isOpen, initialClass]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tr('Vui lòng nhập tên lớp (ví dụ: 12A1, 12A2, 12D1).'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const classId = initialClass?.id || `class-${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
      const saved: SchoolClass = {
        id: classId,
        name: name.trim().toUpperCase(),
        grade: Number(grade) || 12,
        academicYear: academicYear.trim() || '2026-2027',
        homeroomTeacher: homeroomTeacher.trim() || undefined,
        description: description.trim() || undefined,
        createdAt: initialClass?.createdAt || new Date().toLocaleDateString('vi-VN'),
      };

      await onSaveClass(saved);
      showToast(initialClass ? `Đã cập nhật thông tin lớp ${saved.name}!` : `Đã tạo mới lớp ${saved.name} thành công!`);
      onClose();
    } catch (err: any) {
      console.error('Error saving class:', err);
      setError(err?.message || tr('Không thể lưu lớp học. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-soft to-brand-soft/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialClass ? tr('Chỉnh sửa thông tin lớp') : tr('Thêm lớp học mới')}
              </h3>
              <p className="text-xs text-brand">{tr('Trường THPT Trần Hưng Đạo')}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên lớp <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: 12A1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-brand transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {tr('Khối lớp:')}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand transition"
              >
                <option value={12}>{tr('Khối 12')}</option>
                <option value={11}>{tr('Khối 11')}</option>
                <option value={10}>{tr('Khối 10')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {tr('Giáo viên chủ nhiệm:')}
            </label>
            <input
              type="text"
              value={homeroomTeacher}
              onChange={(e) => setHomeroomTeacher(e.target.value)}
              placeholder={tr('VD: ThS. Lê Hoàng Nam')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {tr('Năm học:')}
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mô tả / Ban học:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr('VD: Lớp chuyên Toán - Khoa học Tự nhiên')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-brand transition"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
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
              <School className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : initialClass ? tr('Lưu thay đổi') : tr('Tạo lớp học')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
