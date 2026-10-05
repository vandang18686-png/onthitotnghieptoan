import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { SchoolClass, UserAccount } from '../types/exam';
import { generateStudentUsername } from '../utils/excelUtils';

interface ManualAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: SchoolClass;
  existingAccounts: UserAccount[];
  onAddStudent: (newAccount: UserAccount) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ManualAddStudentModal: React.FC<ManualAddStudentModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  existingAccounts,
  onAddStudent,
  showToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setStudentId('');
      setUsername('');
      setPassword('123456');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-generate username when studentId changes
  const handleStudentIdChange = (idVal: string) => {
    setStudentId(idVal);
    if (!username || username.startsWith('hs_')) {
      setUsername(generateStudentUsername(idVal, fullName));
    }
  };

  const handleFullNameChange = (nameVal: string) => {
    setFullName(nameVal);
    if (!username || username.startsWith('hs_')) {
      setUsername(generateStudentUsername(studentId, nameVal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(tr('Vui lòng nhập họ và tên học sinh.'));
      return;
    }
    if (!studentId.trim()) {
      setError(tr('Vui lòng nhập mã học sinh / số báo danh.'));
      return;
    }
    if (!username.trim()) {
      setError(tr('Vui lòng nhập tên đăng nhập.'));
      return;
    }

    // Check duplicate username
    const isDup = existingAccounts.some(
      (a) => a.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (isDup) {
      setError(`Tên đăng nhập "${username}" đã tồn tại. Vui lòng chọn tên đăng nhập khác.`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newAcc: UserAccount = {
        id: `acc-std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fullName: fullName.trim().replace(/\s+/g, ' ').normalize('NFC'),
        studentId: studentId.trim(),
        username: username.trim(),
        password: password.trim() || '123456',
        role: 'student',
        classGroup: targetClass.name,
        school: 'Trường THPT Trần Hưng Đạo',
        createdAt: new Date().toLocaleDateString('vi-VN'),
      };

      await onAddStudent(newAcc);
      showToast(`Đã thêm học sinh "${newAcc.fullName}" vào lớp ${targetClass.name} thành công!`);
      onClose();
    } catch (err: any) {
      console.error('Error adding student:', err);
      setError(err?.message || tr('Không thể tạo tài khoản học sinh. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-brand-soft/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thêm học sinh vào lớp {targetClass.name}
              </h3>
              <p className="text-xs text-blue-700">{tr('Tạo tài khoản học sinh thủ công')}</p>
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Họ và tên học sinh <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              placeholder={tr('VD: Nguyễn Văn An')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 transition"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Mã học sinh / Số báo danh (SBD) <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => handleStudentIdChange(e.target.value)}
              placeholder="VD: 120101"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-600 font-mono transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tài khoản đăng nhập <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: hs_120101"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 font-mono focus:bg-white focus:ring-2 focus:ring-blue-600 transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {tr('Mật khẩu ban đầu:')}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:bg-white focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{tr('Thông tin lớp học:')}</span>
            </div>
            <div>{tr('Lớp:')}<strong>{targetClass.name}</strong>{tr('• Khối:')}<strong>{targetClass.grade}</strong></div>
            <div>{tr('Trường:')}<strong>{tr('Trường THPT Trần Hưng Đạo')}</strong></div>
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? tr('Đang tạo...') : tr('Tạo tài khoản')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
