import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, Save, KeyRound, User, School, GraduationCap, Briefcase } from 'lucide-react';
import { UserAccount } from '../types/exam';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  onSave: (updatedAccount: UserAccount) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setFullName(account.fullName || '');
      setPassword(account.password || '');
      setSchool(account.school || 'Trường THPT Trần Hưng Đạo');
      setClassGroup(account.classGroup || '');
      setStudentId(account.studentId || '');
      setDepartment(account.department || '');
      setError('');
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(tr('Vui lòng nhập họ và tên.'));
      return;
    }
    if (!password.trim()) {
      setError(tr('Vui lòng nhập mật khẩu.'));
      return;
    }

    const updated: UserAccount = {
      ...account,
      fullName: fullName.trim(),
      password: password.trim(),
      school: school.trim() || 'Trường THPT Trần Hưng Đạo',
      classGroup: account.role === 'student' ? classGroup.trim() : undefined,
      studentId: account.role === 'student' ? studentId.trim() : undefined,
      department: account.role === 'teacher' ? department.trim() : undefined,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              account.role === 'teacher' ? 'bg-brand-soft text-brand' : 'bg-blue-100 text-blue-700'
            }`}>
              {account.role === 'teacher' ? <Briefcase className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {tr('Chỉnh sửa tài khoản')}
              </h3>
              <p className="text-xs text-slate-500">
                Tên đăng nhập: <strong className="font-mono text-brand font-bold">@{account.username}</strong> ({account.role === 'teacher' ? tr('Giáo viên') : tr('Học sinh')})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
            aria-label={tr('Đóng')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition pl-9"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition pl-9 font-mono"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {tr('Thầy cô có thể đổi mật khẩu mới cho học sinh hoặc giáo viên nếu quên mật khẩu.')}
            </p>
          </div>

          {account.role === 'student' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {tr('Lớp:')}
                </label>
                <input
                  type="text"
                  value={classGroup}
                  onChange={(e) => setClassGroup(e.target.value)}
                  placeholder="VD: 12A1"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số báo danh (SBD):
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="VD: 75001284"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-mono"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {tr('Tổ chuyên môn:')}
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={tr('VD: Tổ Toán - Tin học')}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Đơn vị / Trường học:
            </label>
            <div className="relative">
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition pl-9"
              />
              <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              {tr('Hủy bỏ')}
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-brand hover:bg-ink text-white font-bold text-xs transition shadow-md shadow-brand/20 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{tr('Lưu thay đổi')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
