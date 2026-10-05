import React, { useEffect, useRef, useState } from 'react';
import { X, Save, User } from 'lucide-react';
import { UserAccount } from '../types/exam';
import { tr } from '../i18n/LanguageContext';

interface Props {
  student: UserAccount | null;
  onClose: () => void;
  /** Resolves true when the name was stored. */
  onSave: (fullName: string) => Promise<boolean>;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().normalize('NFC');

export const EditStudentNameModal: React.FC<Props> = ({ student, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!student) return;
    setName(student.fullName || '');
    setError('');
    setSaving(false);
    const t = setTimeout(() => { input.current?.focus(); input.current?.select(); }, 30);
    return () => clearTimeout(t);
  }, [student]);

  useEffect(() => {
    if (!student) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [student, onClose]);

  if (!student) return null;

  const submit = async () => {
    const next = clean(name);
    if (!next) return setError(tr('Vui lòng nhập họ và tên.'));
    if (next.length > 80) return setError(tr('Tên quá dài (tối đa 80 ký tự).'));
    if (next === student.fullName) return onClose();
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-ink">{tr('Sửa tên học sinh')}</h3>
              <p className="text-xs text-ink-2 truncate">
                {tr('Tên đăng nhập')}: <span className="font-mono font-semibold">{student.username}</span>
                {student.studentId ? <> · {tr('Mã HS')}: <span className="font-mono font-semibold">{student.studentId}</span></> : null}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label={tr('Đóng')} className="p-1.5 text-ink-2 hover:text-ink hover:bg-paper rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-2">
          <label className="block text-sm font-semibold text-ink mb-1.5" htmlFor="edit-student-name">{tr('Họ và tên học sinh')}</label>
          <input
            id="edit-student-name"
            ref={input}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            maxLength={120}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-white text-ink font-semibold outline-none focus:border-slate-400"
          />
          {error && <p className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
          <p className="mt-2 text-xs text-ink-2 leading-relaxed">
            {tr('Tên đăng nhập và mật khẩu không thay đổi.')} {tr('Các bài đã nộp trước đó sẽ hiển thị theo tên mới.')}
          </p>
        </div>

        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-2 border border-line rounded-lg hover:bg-paper cursor-pointer">
            {tr('Hủy')}
          </button>
          <button onClick={submit} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg cursor-pointer disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? tr('Đang lưu...') : tr('Lưu tên')}
          </button>
        </div>
      </div>
    </div>
  );
};
