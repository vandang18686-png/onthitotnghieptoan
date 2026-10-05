import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, Edit3, Save, Calendar, Sparkles } from 'lucide-react';
import { Announcement } from '../types/exam';

interface EditAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  onSave: (updatedAnnouncement: Announcement) => void;
}

export const EditAnnouncementModal: React.FC<EditAnnouncementModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || '');
      setContent(announcement.content || '');
      setAuthor(announcement.author || '');
      setDate(announcement.date || new Date().toLocaleDateString('vi-VN'));
      setIsImportant(Boolean(announcement.isImportant));
      setError('');
    }
  }, [announcement, isOpen]);

  if (!isOpen || !announcement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(tr('Vui lòng nhập tiêu đề thông báo'));
      return;
    }
    if (!content.trim()) {
      setError(tr('Vui lòng nhập nội dung chi tiết thông báo'));
      return;
    }

    const updated: Announcement = {
      ...announcement,
      title: title.trim(),
      content: content.trim(),
      author: author.trim() || 'Trường THPT Trần Hưng Đạo',
      date: date.trim() || new Date().toLocaleDateString('vi-VN'),
      isImportant,
    };

    onSave(updated);
    onClose();
  };

  const handleSetToday = () => {
    setDate(new Date().toLocaleDateString('vi-VN'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {tr('Chỉnh sửa thông báo')}
              </h3>
              <p className="text-xs text-slate-500">
                {tr('Cập nhật thông tin bảng tin hiển thị tới học sinh')}
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
              Tiêu đề thông báo: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr('VD: Hướng dẫn ôn tập tốt nghiệp THPT...')}
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nội dung chi tiết: <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={tr('Nhập nội dung thông báo...')}
              className="w-full p-4 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tác giả / Đơn vị ban hành:
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={tr('VD: Ban Giám Hiệu & Tổ Chuyên Môn')}
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {tr('Ngày thông báo:')}
                </label>
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  {tr('Cập nhật hôm nay')}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition pl-9"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Toggle isImportant */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-50 transition">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {tr('Đánh dấu là thông báo quan trọng')}
                </span>
                <span className="text-[11px] text-amber-700 block">
                  Hiển thị huy hiệu "Quan trọng" nổi bật để học sinh chú ý hơn.
                </span>
              </div>
            </label>
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
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
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
