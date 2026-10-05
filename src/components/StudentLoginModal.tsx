import React, { useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { GraduationCap, X, User, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const StudentLoginModal: React.FC = () => {
  const { t } = useLang();
  const { isStudentModalOpen, closeStudentModal, loginAsStudent } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isStudentModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError(t('errStudentEmpty'));
      return;
    }
    if (!password) {
      setError(t('errPasswordEmpty'));
      return;
    }
    const ok = loginAsStudent(username.trim(), password);
    if (!ok) {
      setError(t('errLogin'));
    } else {
      setUsername('');
      setPassword('');
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl p-7 border border-slate-100 transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <GraduationCap className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {t('studentLoginT')}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {t('examSystem')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setError('');
              closeStudentModal();
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer -mr-1.5 -mt-1"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Username Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t('studentAcct')}
            </label>
            <div className="flex items-center bg-slate-50/80 border border-slate-200/90 rounded-2xl px-4 py-3.5 focus-within:bg-white focus-within:border-slate-400 transition">
              <User className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder={t('enterUser')}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t('password')}
            </label>
            <div className="flex items-center bg-slate-50/80 border border-slate-200/90 rounded-2xl px-4 py-3.5 focus-within:bg-white focus-within:border-slate-400 transition">
              <KeyRound className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('enterPass')}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Notice Box */}
          <div className="p-3.5 bg-slate-50/90 border border-slate-100 rounded-2xl text-xs text-slate-500 italic leading-relaxed">
            {t('studentNote')}
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-brand hover:bg-brand/90 active:bg-brand/80 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand/20 transition-all cursor-pointer flex items-center justify-center mt-2"
          >
            {t('signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};
