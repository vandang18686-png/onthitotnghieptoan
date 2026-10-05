import React, { useState, useMemo } from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  Users,
  UserPlus,
  Search,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Cloud,
  AlertTriangle,
  School,
  Briefcase,
  X,
} from 'lucide-react';
import { UserAccount, UserProfile } from '../types/exam';

interface AccountManagementTabProps {
  accounts: UserAccount[];
  currentUser: UserProfile | null;
  onCreateAccount: (data: Omit<UserAccount, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string; user?: UserAccount }>;
  onDeleteAccount: (id: string) => Promise<boolean>;
  showToast: (msg: string) => void;
}

export const AccountManagementTab: React.FC<AccountManagementTabProps> = ({
  accounts,
  currentUser,
  onCreateAccount,
  onDeleteAccount,
  showToast,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<UserAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Form State for new account
  const [formRole, setFormRole] = useState<'student' | 'teacher'>('student');
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123');
  const [formStudentId, setFormStudentId] = useState('');
  const [formClassGroup, setFormClassGroup] = useState('12A1');
  const [formDepartment, setFormDepartment] = useState('Tổ Toán - Tin học');
  const [formSchool, setFormSchool] = useState('Trường THPT Trần Hưng Đạo');
  const [formError, setFormError] = useState('');

  const studentCount = useMemo(() => accounts.filter((a) => a.role === 'student').length, [accounts]);
  const teacherCount = useMemo(() => accounts.filter((a) => a.role === 'teacher').length, [accounts]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchRole = roleFilter === 'all' || acc.role === roleFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        acc.fullName.toLowerCase().includes(term) ||
        acc.username.toLowerCase().includes(term) ||
        (acc.studentId && acc.studentId.toLowerCase().includes(term)) ||
        (acc.classGroup && acc.classGroup.toLowerCase().includes(term)) ||
        (acc.department && acc.department.toLowerCase().includes(term)) ||
        (acc.school && acc.school.toLowerCase().includes(term));

      return matchRole && matchSearch;
    });
  }, [accounts, roleFilter, searchTerm]);

  // Copy password to clipboard
  const handleCopyPassword = (pass: string, id: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(tr('Đã sao chép mật khẩu vào clipboard!'));
  };

  // Toggle reveal password
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Reset form
  const resetForm = () => {
    setFormFullName('');
    setFormUsername('');
    setFormPassword('123');
    setFormStudentId('');
    setFormClassGroup('12A1');
    setFormDepartment('Tổ Toán - Tin học');
    setFormSchool('Trường THPT Trần Hưng Đạo');
    setFormError('');
  };

  // Submit new account
  const handleSubmitNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formFullName.trim()) {
      setFormError(tr('Vui lòng nhập họ và tên.'));
      return;
    }
    if (!formUsername.trim()) {
      setFormError(tr('Vui lòng nhập tên tài khoản (username).'));
      return;
    }
    if (!formPassword.trim()) {
      setFormError(tr('Vui lòng nhập mật khẩu khởi tạo.'));
      return;
    }

    setIsSubmitting(true);
    const newAccountData: Omit<UserAccount, 'id' | 'createdAt'> = {
      fullName: formFullName.trim(),
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim(),
      role: formRole,
      school: formSchool.trim() || 'Trường THPT Trần Hưng Đạo',
      avatarUrl:
        formRole === 'student'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      ...(formRole === 'student'
        ? {
            studentId: formStudentId.trim() || '750' + Math.floor(10000 + Math.random() * 90000),
            classGroup: formClassGroup.trim() || '12A1',
          }
        : {
            department: formDepartment.trim() || 'Tổ Chuyên Môn',
          }),
    };

    try {
      const res = await onCreateAccount(newAccountData);
      if (res.success) {
        showToast(res.message);
        setIsModalOpen(false);
        resetForm();
      } else {
        setFormError(res.message);
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi lưu tài khoản lên Cloud Firestore');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute delete account safely
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    if (currentUser && (accountToDelete.id === currentUser.id || accountToDelete.username.toLowerCase() === currentUser.username.toLowerCase())) {
      showToast(tr('Không thể xóa tài khoản bạn đang dùng để đăng nhập!'));
      setAccountToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onDeleteAccount(accountToDelete.id);
      if (success) {
        showToast(`Đã xóa tài khoản "${accountToDelete.fullName}" khỏi Cloud Firestore.`);
      } else {
        showToast(tr('Không thể xóa tài khoản, vui lòng thử lại.'));
      }
    } catch (err) {
      showToast(tr('Lỗi khi xóa tài khoản khỏi Firestore.'));
    } finally {
      setIsDeleting(false);
      setAccountToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{accounts.length}</div>
            <div className="text-xs font-semibold text-slate-500">{tr('Tổng tài khoản hệ thống')}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{studentCount}</div>
            <div className="text-xs font-semibold text-slate-500">{tr('Tài khoản Học sinh')}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{teacherCount}</div>
            <div className="text-xs font-semibold text-slate-500">{tr('Tài khoản Giáo viên')}</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {tr('Đã đồng bộ Cloud')}
            </div>
            <div className="text-xs font-medium text-slate-500">{tr('Lưu trữ Firestore đám mây')}</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tr('Tìm theo tên, tài khoản, SBD, lớp, bộ môn...')}
            className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              {tr('×')}
            </button>
          )}
        </div>

        {/* Role Filters + New Account Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          {/* Role Filter Chips */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-brand shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({accounts.length})
            </button>
            <button
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                roleFilter === 'student' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học sinh ({studentCount})
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                roleFilter === 'teacher' ? 'bg-white text-brand shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giáo viên ({teacherCount})
            </button>
          </div>

          {/* "Tạo tài khoản mới" Button */}
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand to-brand hover:from-brand hover:to-brand text-white rounded-xl text-xs font-bold shadow-md shadow-brand/25 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{tr('Tạo tài khoản mới')}</span>
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">{tr('Họ và tên')}</th>
                <th className="py-3.5 px-4">{tr('Tên tài khoản (Username)')}</th>
                <th className="py-3.5 px-4">{tr('Vai trò')}</th>
                <th className="py-3.5 px-4">{tr('SBD / Bộ môn')}</th>
                <th className="py-3.5 px-4">{tr('Trường / Lớp')}</th>
                <th className="py-3.5 px-4">{tr('Mật khẩu khởi tạo')}</th>
                <th className="py-3.5 px-4">{tr('Ngày cấp')}</th>
                <th className="py-3.5 px-4 text-center">{tr('Thao tác')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">{tr('Không tìm thấy tài khoản nào phù hợp.')}</p>
                    <p className="text-xs text-slate-400 mt-1">{tr('Thử thay đổi từ khóa hoặc bộ lọc vai trò.')}</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isCurrentLoggedIn =
                    currentUser &&
                    (acc.id === currentUser.id || acc.username.toLowerCase() === currentUser.username.toLowerCase());
                  const isRevealed = !!revealedPasswords[acc.id];
                  const passwordValue = acc.password || '123';

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-brand-soft/30 transition-colors ${
                        isCurrentLoggedIn ? 'bg-brand-soft/40' : ''
                      }`}
                    >
                      {/* Full Name & Avatar */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              acc.avatarUrl ||
                              (acc.role === 'student'
                                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                                : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
                            }
                            alt={acc.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              {acc.fullName}
                              {isCurrentLoggedIn && (
                                <span className="text-[10px] bg-brand-soft text-brand px-1.5 py-0.5 rounded-md font-bold">
                                  {tr('Bạn')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">ID: {acc.id.slice(0, 14)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded-md text-[11px] border border-slate-200">
                          {acc.username}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {acc.role === 'teacher' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-soft text-brand border border-brand/25">
                            <ShieldCheck className="w-3 h-3" />
                            {tr('Giáo viên')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            <GraduationCap className="w-3 h-3" />
                            {tr('Học sinh')}
                          </span>
                        )}
                      </td>

                      {/* SBD / Department */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {acc.role === 'student' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium">SBD:</span>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {acc.studentId || 'Chưa cấp'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <Briefcase className="w-3 h-3 text-brand shrink-0" />
                            <span>{acc.department || 'Tổ Chuyên Môn'}</span>
                          </div>
                        )}
                      </td>

                      {/* School / Class */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {acc.role === 'student' && acc.classGroup ? `Lớp ${acc.classGroup}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {acc.school || 'Trường THPT Trần Hưng Đạo'}
                        </div>
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span className="font-mono font-bold text-slate-800">
                            {isRevealed ? passwordValue : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(acc.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            title={isRevealed ? tr('Ẩn mật khẩu') : tr('Hiện mật khẩu')}
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(passwordValue, acc.id)}
                            className="p-1 text-slate-400 hover:text-brand transition cursor-pointer"
                            title={tr('Sao chép mật khẩu')}
                          >
                            {copiedId === acc.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {acc.createdAt || '01/09/2026'}
                      </td>

                      {/* Action: Delete */}
                      <td className="py-3.5 px-4 text-center">
                        {isCurrentLoggedIn ? (
                          <span
                            className="text-slate-400 text-[11px] italic"
                            title={tr('Không thể xóa tài khoản bạn đang đăng nhập')}
                          >
                            {tr('Đang dùng')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAccountToDelete(acc)}
                            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer border border-transparent hover:border-red-200"
                            title={`Xóa tài khoản ${acc.fullName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Hiển thị {filteredAccounts.length} / {accounts.length} tài khoản</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-brand" />
            {tr('Mọi thay đổi tài khoản được đồng bộ vĩnh viễn với Cloud Firestore')}
          </div>
        </div>
      </div>

      {/* CREATE NEW ACCOUNT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand to-brand text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">{tr('Tạo tài khoản mới trên Cloud')}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitNewAccount} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Vai trò tài khoản <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormRole('student')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formRole === 'student'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>{tr('Học sinh (Thí sinh)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('teacher')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formRole === 'teacher'
                        ? 'border-brand bg-brand-soft/70 text-brand shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{tr('Giáo viên (Đồng nghiệp)')}</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder={formRole === 'student' ? tr('Ví dụ: Nguyễn Văn An') : tr('Ví dụ: ThS. Trần Thị Mai')}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                />
              </div>

              {/* Username & Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập (Username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="vd: hocsinh12a, maitt"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{tr('Viết liền không dấu')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={tr('Mặc định: 123')}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{tr('Học sinh/Giáo viên có thể đổi sau')}</p>
                </div>
              </div>

              {/* Conditional Fields based on Role */}
              {formRole === 'student' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số báo danh (SBD)
                    </label>
                    <input
                      type="text"
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      placeholder="vd: 75001285"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {tr('Lớp học')}
                    </label>
                    <input
                      type="text"
                      value={formClassGroup}
                      onChange={(e) => setFormClassGroup(e.target.value)}
                      placeholder="vd: 12A1, 12A2..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tổ chuyên môn / Bộ môn
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder={tr('vd: Tổ Toán - Tin học, Tổ Vật Lý - Hóa Học...')}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                  />
                </div>
              )}

              {/* School / Organization */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trường / Đơn vị
                </label>
                <input
                  type="text"
                  value={formSchool}
                  onChange={(e) => setFormSchool(e.target.value)}
                  placeholder={tr('Trường THPT Trần Hưng Đạo')}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                />
              </div>

              {/* Cloud persistent notice */}
              <div className="p-3 bg-brand-soft/60 border border-brand-soft rounded-xl text-[11px] text-ink flex items-start gap-2">
                <Cloud className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>
                  {tr('Tài khoản sau khi tạo sẽ được lưu trực tiếp vào cơ sở dữ liệu Cloud Firestore. Học sinh hoặc giáo viên có thể đăng nhập ngay trên mọi thiết bị và máy tính khác.')}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  {tr('Hủy bỏ')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand to-brand hover:from-brand hover:to-brand text-white font-bold text-xs shadow-md shadow-brand/25 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{tr('Đang lưu Cloud...')}</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{tr('Xác nhận tạo tài khoản')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE ACCOUNT CONFIRMATION MODAL */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa tài khoản vĩnh viễn')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản{' '}
              <strong className="text-slate-900 font-semibold">"{accountToDelete.fullName}"</strong>{' '}
              (Username:{' '}
              <span className="font-mono text-brand font-bold bg-brand-soft px-1.5 py-0.5 rounded border border-brand/25">
                {accountToDelete.username}
              </span>
              )?
              <br />
              <span className="text-red-600 font-semibold block mt-2">
                {tr('Dữ liệu tài khoản sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu Cloud Firestore.')}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? tr('Đang xóa...') : tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
