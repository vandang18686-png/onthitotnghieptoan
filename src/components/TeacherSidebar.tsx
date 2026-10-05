import React from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  BookOpen,
  BarChart3,
  Users,
  Bell,
  UserCog,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  School,
  X,
} from 'lucide-react';

export type TeacherTabKey = 'management' | 'analytics' | 'classes' | 'announcements' | 'accounts' | 'homepage';

interface TeacherSidebarProps {
  activeTab: TeacherTabKey;
  onSelectTab: (tab: TeacherTabKey) => void;
  badgeCounts: Partial<Record<TeacherTabKey, number>>;
  onBackToHome: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  teacherName?: string;
}

interface MenuItem {
  key: TeacherTabKey;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const getMenuItems = (): MenuItem[] => [
  {
    key: 'homepage',
    label: tr('Trang chủ'),
    subtitle: tr('Nội dung & giao diện'),
    icon: LayoutTemplate,
  },
  {
    key: 'management',
    label: tr('Đề kiểm tra'),
    subtitle: tr('Soạn & quản lý'),
    icon: BookOpen,
  },
  {
    key: 'analytics',
    label: tr('Kết quả'),
    subtitle: tr('Điểm & phân tích'),
    icon: BarChart3,
  },
  {
    key: 'classes',
    label: tr('Học sinh'),
    subtitle: tr('Lớp & giao bài'),
    icon: Users,
  },
  {
    key: 'announcements',
    label: tr('Thông báo'),
    subtitle: tr('Đăng & quản lý'),
    icon: Bell,
  },
  {
    key: 'accounts',
    label: tr('Tài khoản'),
    subtitle: tr('Người dùng & phân quyền'),
    icon: UserCog,
  },
];

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  activeTab,
  onSelectTab,
  badgeCounts,
  onBackToHome,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  teacherName = 'Nguyễn Văn Đăng',
}) => {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:sticky top-0 bottom-0 left-0 z-50 lg:z-20
          bg-white border-r border-slate-200/90
          flex flex-col justify-between
          transition-all duration-200 ease-in-out
          shadow-[1px_0_8px_rgba(0,0,0,0.03)]
          h-screen
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}
        `}
      >
        {/* Top Header of Sidebar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-brand-soft text-brand border border-brand-soft flex items-center justify-center shrink-0 font-bold">
                <School className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 tracking-tight uppercase truncate">
                  {tr('QUẢN TRỊ GIÁO VIÊN')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  Education Management
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-brand-soft text-brand border border-brand-soft flex items-center justify-center font-bold">
                <School className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title={isCollapsed ? tr('Mở rộng thanh điều hướng') : tr('Thu gọn thanh điều hướng')}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu Items */}
        <div className="flex-1 py-3 px-2 sm:px-2.5 space-y-1.5 overflow-y-auto no-scrollbar">
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const count = badgeCounts[item.key] ?? 0;

            if (isCollapsed) {
              return (
                <div key={item.key} className="relative group flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab(item.key);
                      onCloseMobile();
                    }}
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer
                      ${
                        isActive
                          ? 'bg-brand-soft text-brand shadow-2xs relative before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:bg-brand before:rounded-r'
                          : 'text-slate-600 hover:text-brand hover:bg-slate-50'
                      }
                    `}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </button>

                  {/* Tooltip on Hover in Collapsed Mode */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-xl pointer-events-none whitespace-nowrap text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div>
                      <div className="font-semibold text-white">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.subtitle}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/30 text-white/80 border border-brand/30">
                      {item.key === 'homepage' ? '✎' : `[${count}]`}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onSelectTab(item.key);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group text-left
                  ${
                    isActive
                      ? 'bg-brand-soft text-brand font-semibold relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand before:rounded-r'
                      : 'text-slate-700 hover:text-brand hover:bg-slate-50/80 font-medium'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-brand' : 'text-slate-400 group-hover:text-brand'
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold leading-tight truncate ${
                        isActive ? 'text-brand' : 'text-slate-800 group-hover:text-brand'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div
                      className={`text-[10px] leading-tight truncate mt-0.5 ${
                        isActive ? 'text-brand/75' : 'text-slate-400 group-hover:text-slate-500'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {/* Badge [count] */}
                <span
                  className={`
                    ml-2 px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0 transition-colors
                    ${
                      isActive
                        ? 'bg-brand-soft text-brand border border-brand/25/60'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-brand-soft group-hover:text-brand'
                    }
                  `}
                >
                  {item.key === 'homepage' ? '✎' : `[${count}]`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer of Sidebar */}
        <div className="p-3 border-t border-slate-100 shrink-0 space-y-2">
          {/* Teacher Profile */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-brand-soft text-brand font-bold text-xs flex items-center justify-center shrink-0">
                {teacherName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">{tr('Giáo viên')}</div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {teacherName}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group flex justify-center">
              <div
                className="w-9 h-9 rounded-xl bg-brand-soft text-brand font-bold text-xs flex items-center justify-center cursor-default"
                title={`Giáo viên: ${teacherName}`}
              >
                {teacherName.charAt(0)}
              </div>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block px-2.5 py-1.5 bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-xs font-medium animate-in fade-in zoom-in-95 duration-150">
                Giáo viên: {teacherName}
              </div>
            </div>
          )}

          {/* Back to Home */}
          {isCollapsed ? (
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={onBackToHome}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title={tr('Về trang chủ')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block px-2.5 py-1.5 bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-xs font-medium animate-in fade-in zoom-in-95 duration-150">
                {tr('Về trang chủ')}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-xs font-semibold cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
              <span>{tr('Về trang chủ')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
