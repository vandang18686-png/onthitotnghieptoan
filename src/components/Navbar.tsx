import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';

interface NavbarProps {
  onNavigateHome: () => void;
  onNavigateTeacherAdmin?: () => void;
  currentView?: string;
  brand?: string;
  school?: string;
}

/** Three bubbles = the three parts of the answer sheet. */
const Mark = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <rect width="34" height="34" rx="9" fill="#14213d" />
    <circle cx="11" cy="17" r="4.5" style={{ fill: 'var(--color-brand)' }} />
    <circle cx="23" cy="11" r="4.5" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="23" cy="23" r="4.5" fill="#f2b134" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ onNavigateHome, onNavigateTeacherAdmin, currentView, brand, school }) => {
  const { user, role, logout, openStudentModal, openTeacherModal } = useAuth();
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button onClick={onNavigateHome} className="flex items-center gap-3 text-left cursor-pointer">
          <Mark />
          <span className="leading-tight">
            <span className="block font-bold text-sm sm:text-base text-ink">{brand || t('brand')}</span>
            <span className="block text-xs text-ink-2">{school || t('school')}</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch />
          {role === 'guest' ? (
            <>
              <button onClick={openStudentModal} className="px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper rounded-lg cursor-pointer">
                {t('student')}
              </button>
              <button onClick={openTeacherModal} className="px-3 py-1.5 text-sm font-semibold bg-ink text-white hover:bg-ink/90 rounded-lg cursor-pointer">
                {t('teacher')}
              </button>
            </>
          ) : (
            <>
              {role === 'teacher' && onNavigateTeacherAdmin && currentView !== 'teacher_admin' && (
                <button onClick={onNavigateTeacherAdmin} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-brand text-white rounded-lg cursor-pointer">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('admin')}</span>
                </button>
              )}
              <div className="text-right hidden sm:block leading-tight">
                <div className="text-sm font-semibold text-ink">{user?.fullName}</div>
                <div className="text-xs text-ink-2">
                  {role === 'student' ? `${user?.classGroup ?? ''} · ${t('candidateNo')} ${user?.studentId ?? ''}` : t('teacher')}
                </div>
              </div>
              <button onClick={logout} title={t('logout')} aria-label={t('logout')} className="p-2 text-ink-2 hover:text-stamp hover:bg-paper rounded-lg cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
