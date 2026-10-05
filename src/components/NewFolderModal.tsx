import React, { useState, useEffect } from 'react';
import { tr } from '../i18n/LanguageContext';
import { X, FolderPlus, Edit3, Folder } from 'lucide-react';
import { ExamFolder } from '../types/exam';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder?: (folder: ExamFolder) => void;
  onUpdateFolder?: (folder: ExamFolder) => void;
  editingFolder?: ExamFolder | null;
}

const getColorOptions = () => [
  { label: tr('Xanh dương'), value: 'bg-blue-500' },
  { label: tr('Tím'), value: 'bg-purple-500' },
  { label: tr('Xanh lá'), value: 'bg-emerald-500' },
  { label: tr('Hổ phách'), value: 'bg-amber-500' },
  { label: tr('Đỏ hồng'), value: 'bg-rose-500' },
  { label: tr('Chàm'), value: 'bg-indigo-500' },
];

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  onUpdateFolder,
  editingFolder,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-purple-500');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingFolder) {
      setFolderName(editingFolder.name);
      setSelectedColor(editingFolder.color || 'bg-purple-500');
    } else {
      setFolderName('');
      setSelectedColor('bg-purple-500');
    }
    setError('');
  }, [editingFolder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError(tr('Vui lòng nhập tên chuyên đề / thư mục'));
      return;
    }

    if (editingFolder && onUpdateFolder) {
      onUpdateFolder({
        ...editingFolder,
        name: folderName.trim(),
        color: selectedColor,
      });
    } else if (onCreateFolder) {
      const newFolder: ExamFolder = {
        id: `folder-${Date.now()}`,
        name: folderName.trim(),
        color: selectedColor,
        createdAt: new Date().toISOString().split('T')[0],
        examCount: 0,
      };
      onCreateFolder(newFolder);
    }

    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/30 text-white/70 flex items-center justify-center">
              {editingFolder ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <h3 className="font-bold text-base text-white">
              {editingFolder ? tr('Chỉnh Sửa Chuyên Đề / Thư Mục') : tr('Tạo Mới Thư Mục Đề Thi')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Tên chuyên đề / thư mục phân loại:
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setError('');
              }}
              placeholder={tr('VD: Đề Khảo Sát Học Kỳ 1, Chuyên Đề Oxyz...')}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              {tr('Màu sắc nhận diện:')}
            </label>
            <div className="flex items-center gap-3 pt-1">
              {getColorOptions().map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.value} transition-all cursor-pointer ${
                    selectedColor === c.value
                      ? 'ring-3 ring-brand ring-offset-2 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {tr('Hủy')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand hover:bg-ink text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              {editingFolder ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{tr('Lưu Thay Đổi')}</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{tr('Tạo Thư Mục')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
