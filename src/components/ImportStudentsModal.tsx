import React, { useState, useRef } from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle,
  Users,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SchoolClass, UserAccount } from '../types/exam';
import {
  parseStudentExcelFile,
  downloadStudentTemplate,
  generateStudentUsername,
  formatVietnameseName,
  ParsedStudentRow,
} from '../utils/excelUtils';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: SchoolClass;
  existingAccounts: UserAccount[];
  onImportSuccess: (importedAccounts: UserAccount[]) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  existingAccounts,
  onImportSuccess,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    setError('');
    setFile(selectedFile);
    setIsParsing(true);

    try {
      const rows = await parseStudentExcelFile(selectedFile, targetClass.name);
      if (rows.length === 0) {
        setError(tr('Không tìm thấy bản ghi học sinh hợp lệ nào trong file Excel.'));
        setParsedRows([]);
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setError(err?.message || tr('Lỗi khi đọc file Excel.'));
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      handleProcessFile(f);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      handleProcessFile(f);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      setError(tr('Không có học sinh hợp lệ để tạo tài khoản.'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Map parsed rows to UserAccount
      const now = new Date().toLocaleDateString('vi-VN');
      const accountsToCreate: UserAccount[] = validRows.map((row, idx) => {
        // Check if username already exists to avoid collisions
        let finalUsername = row.username;
        const exists = existingAccounts.some((a) => a.username.toLowerCase() === finalUsername.toLowerCase());
        if (exists) {
          finalUsername = `${finalUsername}_${idx + 1}`;
        }

        return {
          id: `acc-std-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          username: finalUsername,
          fullName: row.fullName,
          role: 'student',
          studentId: row.studentId,
          classGroup: row.classGroup || targetClass.name,
          school: 'Trường THPT Trần Hưng Đạo',
          password: row.password || '123456',
          createdAt: now,
        };
      });

      await onImportSuccess(accountsToCreate);
      showToast(`Đã nhập và tự động tạo thành công ${accountsToCreate.length} tài khoản học sinh cho lớp ${targetClass.name}!`);
      onClose();
    } catch (err: any) {
      console.error('Import accounts error:', err);
      setError(err?.message || tr('Có lỗi khi tạo tài khoản học sinh vào cơ sở dữ liệu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearInvalidRows = () => {
    setParsedRows((prev) => prev.filter((r) => r.isValid));
  };

  const handleUpdateRowName = (index: number, newName: string) => {
    setParsedRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== index) return r;
        const formatted = formatVietnameseName(newName);
        const isValid = !!formatted.trim();
        const username = generateStudentUsername(r.studentId, formatted || `std_${idx + 1}`);
        return {
          ...r,
          fullName: formatted,
          username,
          isValid,
          error: isValid ? undefined : 'Thiếu họ và tên học sinh',
        };
      })
    );
  };

  const handleUpdateRowId = (index: number, newId: string) => {
    setParsedRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== index) return r;
        const cleanId = newId.trim();
        const username = generateStudentUsername(cleanId, r.fullName || `std_${idx + 1}`);
        return {
          ...r,
          studentId: cleanId,
          username,
        };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nhập danh sách học sinh lớp {targetClass.name} từ file Excel
              </h3>
              <p className="text-xs text-emerald-700">
                {tr('Tự động tạo tài khoản đăng nhập cho toàn bộ học sinh trong danh sách lớp')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('Chưa có file mẫu chuẩn?')}</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tải file mẫu Excel (.xlsx) với các cột: <strong>{tr('Mã học sinh (SBD)')}</strong>, <strong>{tr('Họ và tên')}</strong>, <strong>{tr('Lớp')}</strong>, <strong>{tr('Mật khẩu')}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadStudentTemplate(targetClass.name)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tr('Tải file Excel mẫu (.xlsx)')}</span>
            </button>
          </div>

          {/* Drag & Drop Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-xs">
              {file ? file.name : 'Kéo thả file Excel vào đây hoặc bấm để chọn file từ máy tính'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ định dạng .xlsx, .xls, .csv (Dung lượng tối đa 15MB)
            </p>
            {isParsing && (
              <p className="text-xs text-emerald-600 font-bold mt-2 animate-pulse">
                {tr('Đang đọc và phân tích dữ liệu danh sách học sinh...')}
              </p>
            )}
          </div>

          {/* Preview Table if rows parsed */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    Xem trước dữ liệu ({parsedRows.length} học sinh)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {validRows.length} hợp lệ
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                      {invalidRows.length} lỗi
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearInvalidRows}
                      className="text-amber-600 hover:text-amber-700 font-semibold text-[11px] underline"
                    >
                      Bỏ {invalidRows.length} dòng lỗi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                    }}
                    className="text-slate-400 hover:text-red-500 text-[11px] font-medium"
                  >
                    {tr('Xóa kết quả đọc')}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">STT</th>
                      <th className="py-2 px-3">{tr('Mã HS / SBD')}</th>
                      <th className="py-2 px-3">{tr('Họ và tên')}</th>
                      <th className="py-2 px-3">{tr('Lớp')}</th>
                      <th className="py-2 px-3">{tr('Tài khoản tự sinh')}</th>
                      <th className="py-2 px-3">{tr('Mật khẩu')}</th>
                      <th className="py-2 px-2 text-center w-12">{tr('Xóa')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/60'}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          <input
                            type="text"
                            value={row.studentId}
                            onChange={(e) => handleUpdateRowId(idx, e.target.value)}
                            placeholder={tr('Mã HS...')}
                            className="w-24 px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded font-mono font-bold text-slate-800 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          <input
                            type="text"
                            value={row.fullName}
                            onChange={(e) => handleUpdateRowName(idx, e.target.value)}
                            placeholder={tr('Nhập họ và tên học sinh...')}
                            className={`w-full px-1.5 py-0.5 border rounded outline-none font-semibold ${
                              !row.fullName
                                ? 'border-red-400 bg-red-50 text-red-800 placeholder-red-400 focus:border-red-500'
                                : 'border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold font-mono">
                            {row.classGroup || targetClass.name}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-700 font-bold">
                          {row.username}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {row.password}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title={tr('Bỏ dòng này')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="text-[11px] text-slate-500">
            {validRows.length > 0 && (
              <span>{tr('Sẽ tạo')}<strong>{validRows.length}</strong> tài khoản học sinh vào lớp {targetClass.name}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
            >
              {tr('Hủy bỏ')}
            </button>

            <button
              type="button"
              disabled={validRows.length === 0 || isSubmitting}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Đang tạo tài khoản...'
                  : `Xác nhận & Tạo ${validRows.length} tài khoản`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
