import React, { useState, useMemo } from 'react';
import { tr } from '../i18n/LanguageContext';
import {
  School,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Send,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  KeyRound,
  GraduationCap,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { SchoolClass, UserAccount, Exam, ExamAssignment, ExamResult, UserProfile } from '../types/exam';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ManualAddStudentModal } from './ManualAddStudentModal';
import { ClassModal } from './ClassModal';
import { EditStudentNameModal } from './EditStudentNameModal';
import { AssignExamModal } from './AssignExamModal';
import { exportClassAccountsToExcel, downloadStudentTemplate } from '../utils/excelUtils';
import { normClass } from '../utils/resultsExport';
import { CURRENT_SCHOOL_YEAR } from '../data/mockExams';

/** Classes the system used to create on its own; the teacher may remove them if unused. */
const SAMPLE_CLASS_IDS = ['class-12a1', 'class-12a2', 'class-12a3', 'class-12d1'];

interface ClassManagementTabProps {
  classes: SchoolClass[];
  accounts: UserAccount[];
  exams: Exam[];
  assignments: ExamAssignment[];
  results: ExamResult[];
  currentUser: UserProfile | null;
  onSaveClass: (schoolClass: SchoolClass) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void>;
  onAddStudent: (studentAccount: UserAccount) => Promise<void>;
  onBatchAddStudents: (students: UserAccount[]) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<boolean>;
  onUpdateStudent: (studentId: string, data: Partial<UserAccount>) => Promise<boolean>;
  onAssignExam: (data: {
    examId: string;
    classNames: string[];
    deadline?: string;
    note?: string;
    isRequired?: boolean;
  }) => Promise<void>;
  onDeleteAssignment: (assignmentId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ClassManagementTab: React.FC<ClassManagementTabProps> = ({
  classes,
  accounts,
  exams,
  assignments,
  results,
  currentUser,
  onSaveClass,
  onDeleteClass,
  onAddStudent,
  onBatchAddStudents,
  onDeleteStudent,
  onUpdateStudent,
  onAssignExam,
  onDeleteAssignment,
  showToast,
}) => {
  // Navigation inside ClassManagementTab: selected class or null (overview)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'assignments'>('students');

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ExamAssignment | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserAccount | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<UserAccount | null>(null);

  // Search & Filters inside a class
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Students belonging to selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return accounts.filter(
      (a) =>
        a.role === 'student' &&
        (a.classGroup?.toLowerCase().trim() === selectedClass.name.toLowerCase().trim() ||
          a.classGroup?.toLowerCase().trim() === `lớp ${selectedClass.name.toLowerCase().trim()}`)
    );
  }, [accounts, selectedClass]);

  // Filtered students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return classStudents;
    const term = studentSearchTerm.toLowerCase().trim();
    return classStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        (s.studentId && s.studentId.toLowerCase().includes(term)) ||
        s.username.toLowerCase().includes(term)
    );
  }, [classStudents, studentSearchTerm]);

  // Assignments for selected class
  const classAssignments = useMemo(() => {
    if (!selectedClass) return [];
    return assignments.filter(
      (a) => a.classGroup.toLowerCase().trim() === selectedClass.name.toLowerCase().trim()
    );
  }, [assignments, selectedClass]);

  // All student accounts total
  const totalStudentsCount = useMemo(() => {
    return accounts.filter((a) => a.role === 'student').length;
  }, [accounts]);

  // Copy password helper
  const handleCopy = (text: string, id: string, msg: string = 'Đã sao chép vào bộ nhớ tạm!') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(msg);
  };

  // Toggle reveal password
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle delete class confirmation
  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await onDeleteClass(classToDelete.id);
      showToast(`Đã xóa lớp ${classToDelete.name} thành công!`);
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(null);
      }
      setClassToDelete(null);
    } catch (e: any) {
      showToast('Lỗi khi xóa lớp học: ' + (e?.message || ''));
    }
  };

  // Handle delete student confirmation
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await onDeleteStudent(studentToDelete.id);
      showToast(`Đã xóa học sinh "${studentToDelete.fullName}" khỏi hệ thống!`);
      setStudentToDelete(null);
    } catch (e: any) {
      showToast('Lỗi khi xóa học sinh: ' + (e?.message || ''));
    }
  };

  // Handle delete assignment confirmation
  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await onDeleteAssignment(assignmentToDelete.id);
      showToast(`Đã hủy giao bài thi "${assignmentToDelete.examTitle}" cho lớp ${assignmentToDelete.classGroup}!`);
      setAssignmentToDelete(null);
    } catch (e: any) {
      showToast('Lỗi khi hủy giao bài: ' + (e?.message || ''));
    }
  };

  // Copy list of unsubmitted students for teachers to send into class Zalo group
  const handleCopyUnsubmittedStudents = (assignment: ExamAssignment) => {
    // Find students of this class who haven't submitted this exam
    const submittedStudentIds = new Set(
      results
        .filter((r) => r.examId === assignment.examId)
        .map((r) => r.studentId)
    );

    const unsubmitted = classStudents.filter((std) => !submittedStudentIds.has(std.studentId || std.id));

    if (unsubmitted.length === 0) {
      showToast(tr('Tất cả học sinh trong lớp đều đã nộp bài thi!'));
      return;
    }

    const text = `📢 [NHẮC NHỞ NỘP BÀI THI - LỚP ${assignment.classGroup}]\n` +
      `Đề thi: ${assignment.examTitle}\n` +
      `Hạn chót: ${assignment.deadline ? new Date(assignment.deadline).toLocaleString('vi-VN') : 'Không có'}\n` +
      `Hiện còn ${unsubmitted.length} bạn chưa nộp bài:\n` +
      unsubmitted.map((s, idx) => `${idx + 1}. ${s.fullName} (SBD: ${s.studentId || 'Chưa có'})`).join('\n') +
      `\nCác em khẩn trương hoàn thành bài làm đúng hạn!`;

    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép danh sách ${unsubmitted.length} học sinh chưa nộp bài để dán vào Zalo!`);
  };

  const saveStudentName = async (fullName: string): Promise<boolean> => {
    if (!studentToEdit) return false;
    const ok = await onUpdateStudent(studentToEdit.id, { fullName });
    showToast(ok ? `${tr('Đã đổi tên học sinh thành')} "${fullName}"` : tr('Không đổi được tên, vui lòng thử lại.'));
    return ok;
  };

  // ---- Notices: sample classes made by the system, and classes that only exist on student accounts ----
  const sampleClasses = classes.filter((c) => SAMPLE_CLASS_IDS.includes(c.id));
  const sampleAssignments = assignments.filter((a) => sampleClasses.some((c) => normClass(c.name) === normClass(a.classGroup))).length;
  const knownKeys = new Set(classes.map((c) => normClass(c.name)));
  const unlisted = (() => {
    const m = new Map<string, { name: string; count: number }>();
    accounts
      .filter((a) => a.role === 'student' && (a.classGroup || '').trim())
      .forEach((a) => {
        const key = normClass(a.classGroup);
        if (knownKeys.has(key)) return;
        const cur = m.get(key) || { name: (a.classGroup || '').replace(/^lớp\s*/i, '').trim(), count: 0 };
        cur.count += 1;
        m.set(key, cur);
      });
    return Array.from(m.entries()).map(([key, v]) => ({ key, ...v }));
  })();

  const createClassFromAccounts = async (names: { key: string; name: string }[]) => {
    for (const n of names) {
      const slug = n.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
      await onSaveClass({
        id: `class-${slug}`,
        name: n.name,
        grade: parseInt(n.name, 10) || 12,
        academicYear: CURRENT_SCHOOL_YEAR,
        homeroomTeacher: '',
        description: '',
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    showToast(tr('Đã tạo lớp từ danh sách học sinh.'));
  };

  const removeSampleClasses = async () => {
    const msg =
      `${tr('Xóa các lớp mẫu')}: ${sampleClasses.map((c) => c.name).join(', ')}?` +
      (sampleAssignments > 0 ? `\n${tr('Các bài đã giao cho những lớp này vẫn còn trong hệ thống nhưng không gắn với lớp nào.')}` : '');
    if (!window.confirm(msg)) return;
    for (const c of sampleClasses) await onDeleteClass(c.id);
    showToast(tr('Đã xóa các lớp mẫu.'));
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW 1: OVERVIEW - LIST OF ALL CLASSES (When no class is selected)
         ========================================================================= */}
      {!selectedClass ? (
        <div className="space-y-6">
          {/* Compact header: title + actions, with the key numbers in one slim row */}
          <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <School className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-ink leading-tight">
                    {tr('Quản lý học sinh theo lớp & Giao bài thi')}
                  </h2>
                  <p className="text-xs text-ink-2 truncate">{tr('Trường THPT Trần Hưng Đạo • Phân hệ quản lý lớp')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    setIsClassModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-paper text-ink font-semibold text-sm rounded-lg border border-line transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-brand" />
                  <span>{tr('Thêm lớp học')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-3.5 py-2 bg-brand hover:bg-brand/90 text-white font-semibold text-sm rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{tr('Giao bài cho lớp')}</span>
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 border-t border-line bg-paper/60 divide-x divide-line">
              {[
                [classes.length, tr('Tổng số lớp học'), 'text-brand'],
                [totalStudentsCount, tr('Học sinh trong hệ thống'), 'text-emerald-600'],
                [assignments.length, tr('Lượt giao đề cho các lớp'), 'text-short'],
                [exams.length, tr('Đề kiểm tra sẵn có'), 'text-choice'],
              ].map(([n, label, color], i) => (
                <div key={i} className="px-4 py-2.5 flex items-baseline gap-2 min-w-0">
                  <dd className={`text-xl font-extrabold leading-none ${color}`}>{n}</dd>
                  <dt className="text-xs text-ink-2 truncate">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

                    {/* Notices */}
          {sampleClasses.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-amber-900 max-w-3xl">
                <b>{tr('Lớp mẫu do hệ thống tạo sẵn')}</b>: {sampleClasses.map((c) => c.name).join(', ')}. {tr('Nếu thầy không dùng các lớp này, có thể xóa để danh sách chỉ còn lớp của thầy.')}
              </p>
              <button type="button" onClick={removeSampleClasses}
                className="px-3.5 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-semibold hover:bg-amber-100 cursor-pointer">
                {tr('Xóa các lớp mẫu')}
              </button>
            </div>
          )}
          {unlisted.length > 0 && (
            <div className="rounded-2xl border border-line bg-brand-soft p-4 space-y-3">
              <p className="text-sm text-ink">
                <b>{tr('Có học sinh thuộc lớp chưa có trong danh sách lớp')}</b>. {tr('Bấm vào tên lớp để tạo lớp đó.')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {unlisted.map((u) => (
                  <button key={u.key} type="button" onClick={() => createClassFromAccounts([u])}
                    className="px-3 py-1.5 rounded-full bg-white border border-line text-sm font-semibold text-ink hover:border-brand hover:text-brand cursor-pointer">
                    + {tr('Lớp')} {u.name} <span className="font-normal text-ink-2">({u.count} {tr('học sinh')})</span>
                  </button>
                ))}
                {unlisted.length > 1 && (
                  <button type="button" onClick={() => createClassFromAccounts(unlisted)}
                    className="px-3.5 py-1.5 rounded-full bg-brand text-white text-sm font-semibold cursor-pointer">
                    {tr('Tạo tất cả')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Classes Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <School className="w-4 h-4 text-brand" />
                <span>Danh sách các lớp học ({classes.length} lớp)</span>
              </h3>
              <span className="text-xs text-slate-500">
                {tr('Nhấp vào lớp để quản lý học sinh và xem bài tập')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const stdCount = accounts.filter(
                  (a) =>
                    a.role === 'student' &&
                    (a.classGroup?.toLowerCase().trim() === cls.name.toLowerCase().trim() ||
                      a.classGroup?.toLowerCase().trim() === `lớp ${cls.name.toLowerCase().trim()}`)
                ).length;

                const classAssignCount = assignments.filter(
                  (a) => a.classGroup.toLowerCase().trim() === cls.name.toLowerCase().trim()
                ).length;

                return (
                  <div
                    key={cls.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-brand/40 shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Class Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand font-black text-lg flex items-center justify-center border border-brand-soft group-hover:scale-105 transition-transform">
                            {cls.name}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-base">
                                Lớp {cls.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-ink">
                                Khối {cls.grade}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              GVCN: <strong className="text-slate-700">{cls.homeroomTeacher || 'Chưa phân công'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClass(cls);
                              setIsClassModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title={tr('Sửa thông tin lớp')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassToDelete(cls);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title={tr('Xóa lớp học')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {cls.description && (
                        <p className="text-xs text-slate-600 mt-3 line-clamp-1 italic">
                          {cls.description}
                        </p>
                      )}

                      {/* Stats Badges */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900">{stdCount}</div>
                            <div className="text-[10px] text-slate-500">{tr('Học sinh')}</div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-brand shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900">{classAssignCount}</div>
                            <div className="text-[10px] text-slate-500">{tr('Đề đã giao')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setActiveSubTab('students');
                        }}
                        className="flex-1 py-2 px-3 bg-brand hover:bg-brand text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{tr('Xem học sinh')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setIsImportModalOpen(true);
                        }}
                        className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                        title={tr('Nhập danh sách học sinh từ Excel')}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setIsAssignModalOpen(true);
                        }}
                        className="py-2 px-2.5 bg-brand-soft hover:bg-brand-soft text-brand border border-brand/25 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                        title={tr('Giao đề thi cho lớp này')}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: DRILLED-IN DETAILS OF A SELECTED CLASS
           ========================================================================= */
        <div className="space-y-6">
          {/* Top Breadcrumb & Class Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedClassId(null)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title={tr('Quay lại danh sách tất cả các lớp')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Lớp {selectedClass.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-soft text-ink">
                    Khối {selectedClass.grade}
                  </span>
                  <span className="text-xs text-slate-500">
                    Năm học {selectedClass.academicYear}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  GVCN: <strong>{selectedClass.homeroomTeacher || 'Chưa phân công'}</strong>
                  {selectedClass.description && ` • ${selectedClass.description}`}
                </p>
              </div>
            </div>

            {/* Quick Switch Class Dropdown & Actions */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <select
                value={selectedClass.id}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chuyển sang Lớp {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingClass(selectedClass);
                  setIsClassModalOpen(true);
                }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                title={tr('Sửa thông tin lớp')}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-tabs: Students vs Assignments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 px-6 gap-6 text-xs sm:text-sm font-semibold bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveSubTab('students')}
                className={`py-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'students'
                    ? 'border-brand text-brand font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Danh sách học sinh ({classStudents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('assignments')}
                className={`py-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'assignments'
                    ? 'border-brand text-brand font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Bài thi đã giao cho lớp ({classAssignments.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: STUDENTS LIST */}
            {activeSubTab === 'students' && (
              <div className="p-5 sm:p-6 space-y-4">
                {/* Actions Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder={tr('Tìm theo họ tên, SBD, tài khoản...')}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand transition"
                    />
                  </div>

                  {/* Student Management Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsManualAddModalOpen(true)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>{tr('Thêm thủ công')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{tr('Nhập từ Excel (.xlsx)')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportClassAccountsToExcel(selectedClass.name, classStudents)}
                      disabled={classStudents.length === 0}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title={tr('Xuất toàn bộ tài khoản học sinh lớp này ra file Excel để gửi học sinh')}
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>{tr('Xuất Excel tài khoản')}</span>
                    </button>
                  </div>
                </div>

                {/* Table of Students */}
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {classStudents.length === 0
                        ? `Lớp ${selectedClass.name} chưa có học sinh nào`
                        : 'Không tìm thấy học sinh phù hợp với từ khóa'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {classStudents.length === 0
                        ? tr('Bạn có thể nhập danh sách lớp nhanh chóng từ file Excel hoặc bấm "Thêm thủ công" để tạo tài khoản cho học sinh.') : tr('Thử kiểm tra lại từ khóa tìm kiếm họ tên hoặc mã số báo danh.')}
                    </p>
                    {classStudents.length === 0 && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>{tr('Nhập danh sách từ Excel')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStudentTemplate(selectedClass.name)}
                          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                          <span>{tr('Tải file Excel mẫu')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">STT</th>
                          <th className="py-3 px-4">{tr('Mã HS / SBD')}</th>
                          <th className="py-3 px-4">{tr('Họ và tên')}</th>
                          <th className="py-3 px-4">{tr('Tài khoản đăng nhập')}</th>
                          <th className="py-3 px-4">{tr('Mật khẩu')}</th>
                          <th className="py-3 px-4 text-center">{tr('Số bài đã thi')}</th>
                          <th className="py-3 px-4 text-center w-28">{tr('Thao tác')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((std, idx) => {
                          const studentSubmissions = results.filter(
                            (r) => r.studentId === std.id || r.studentId === std.studentId || r.sbd === std.studentId
                          );
                          const isRevealed = revealedPasswords[std.id];
                          const pass = std.password || '123456';

                          return (
                            <tr key={std.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-blue-700">
                                {std.studentId || 'Chưa gán'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {std.fullName}
                              </td>
                              <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                                {std.username}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <span className="text-slate-700 font-bold text-[11px]">
                                    {isRevealed ? pass : '••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealPassword(std.id)}
                                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                    title={isRevealed ? tr('Ẩn mật khẩu') : tr('Hiện mật khẩu')}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(pass, std.id, `Đã copy mật khẩu của ${std.fullName}!`)}
                                    className="text-slate-400 hover:text-brand transition cursor-pointer ml-0.5"
                                    title={tr('Sao chép mật khẩu')}
                                  >
                                    {copiedId === std.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    studentSubmissions.length > 0
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {studentSubmissions.length} bài
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setStudentToEdit(std)}
                                  className="p-1.5 text-ink-2 hover:text-brand hover:bg-brand-soft rounded-lg transition cursor-pointer"
                                  title={tr('Sửa tên học sinh')}
                                  aria-label={tr('Sửa tên học sinh')}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStudentToDelete(std)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title={tr('Xóa học sinh này')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: ASSIGNMENTS FOR THIS CLASS */}
            {activeSubTab === 'assignments' && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Các bài thi được giao cho lớp {selectedClass.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tr('Theo dõi tiến độ nộp bài của học sinh và điểm số chi tiết')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="px-4 py-2 bg-brand hover:bg-brand text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{tr('Giao bài thi mới')}</span>
                  </button>
                </div>

                {classAssignments.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-3">
                      <Send className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Chưa có bài thi nào được giao cho lớp {selectedClass.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Hãy bấm nút "Giao bài thi mới" để chọn đề thi, thiết lập hạn nộp và gửi thông báo trực tiếp tới các học sinh trong lớp.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="mt-4 px-4 py-2.5 bg-brand hover:bg-brand text-white font-bold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{tr('Giao bài thi cho lớp ngay')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classAssignments.map((assign) => {
                      const examObj = exams.find((e) => e.id === assign.examId);
                      
                      // Calculate completed results for this exam by students of this class
                      const classStudentIds = new Set(
                        classStudents.map((s) => s.studentId || s.id)
                      );

                      const submittedResults = results.filter(
                        (r) =>
                          r.examId === assign.examId &&
                          (classStudentIds.has(r.studentId) ||
                            classStudentIds.has(r.sbd) ||
                            r.studentClass?.toLowerCase().trim() === selectedClass.name.toLowerCase().trim())
                      );

                      const totalClassStudents = classStudents.length || 1;
                      const submittedCount = submittedResults.length;
                      const completionPercent = Math.min(
                        100,
                        Math.round((submittedCount / totalClassStudents) * 100)
                      );

                      const avgScore =
                        submittedCount > 0
                          ? (
                              submittedResults.reduce((sum, r) => sum + r.totalScore, 0) /
                              submittedCount
                            ).toFixed(2)
                          : '0.00';

                      const highestScore =
                        submittedCount > 0
                          ? Math.max(...submittedResults.map((r) => r.totalScore)).toFixed(2)
                          : '0.00';

                      return (
                        <div
                          key={assign.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-brand/25 transition space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand font-black text-sm flex items-center justify-center shrink-0">
                                {assign.examCode || 'ĐỀ'}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {assign.examTitle}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                                  <span>Giao ngày: {assign.assignedAt}</span>
                                  {assign.deadline && (
                                    <>
                                      <span>•</span>
                                      <span className="font-bold text-brand flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Hạn nộp: {new Date(assign.deadline).toLocaleString('vi-VN')}</span>
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      assign.isRequired !== false
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {assign.isRequired !== false ? tr('Bắt buộc làm') : tr('Luyện tập')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions on assignment */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleCopyUnsubmittedStudents(assign)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title={tr('Sao chép danh sách học sinh chưa nộp bài để dán vào Zalo nhắc nhở')}
                              >
                                <Copy className="w-3.5 h-3.5 text-amber-700" />
                                <span>{tr('Copy DS chưa nộp')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setAssignmentToDelete(assign)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                title={tr('Hủy giao bài thi này')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Teacher Note */}
                          {assign.note && (
                            <div className="p-2.5 bg-brand-soft/60 rounded-xl border border-brand-soft text-xs text-ink flex items-start gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                              <span>{tr('Lời dặn:')}<strong>{assign.note}</strong></span>
                            </div>
                          )}

                          {/* Progress & Scores Breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-slate-500 font-medium">{tr('Tiến độ nộp bài:')}</span>
                                <span className="font-bold text-slate-800">
                                  {submittedCount} / {classStudents.length} ({completionPercent}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${completionPercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center flex flex-col justify-center">
                              <span className="text-[11px] text-slate-500 font-medium">{tr('Điểm trung bình của lớp')}</span>
                              <span className="text-lg font-black text-blue-700 mt-0.5">{avgScore}đ</span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center flex flex-col justify-center">
                              <span className="text-[11px] text-slate-500 font-medium">{tr('Điểm cao nhất')}</span>
                              <span className="text-lg font-black text-emerald-600 mt-0.5">{highestScore}đ</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
        initialClass={editingClass}
        onSaveClass={onSaveClass}
        showToast={showToast}
      />

      {selectedClass && (
        <>
          <ImportStudentsModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            targetClass={selectedClass}
            existingAccounts={accounts}
            onImportSuccess={onBatchAddStudents}
            showToast={showToast}
          />

          <ManualAddStudentModal
            isOpen={isManualAddModalOpen}
            onClose={() => setIsManualAddModalOpen(false)}
            targetClass={selectedClass}
            existingAccounts={accounts}
            onAddStudent={onAddStudent}
            showToast={showToast}
          />
        </>
      )}

      <AssignExamModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        exams={exams}
        classes={classes}
        preSelectedClass={selectedClass}
        assignedByTeacherName={currentUser?.fullName || 'Giáo viên bộ môn'}
        onAssign={onAssignExam}
        showToast={showToast}
      />

      {/* Confirm Delete Class Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Xác nhận xóa lớp {classToDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp <strong className="text-slate-900 font-bold">{classToDelete.name}</strong>{tr('? Các bài thi được giao và danh sách học sinh của lớp sẽ không còn liên kết với lớp học này.')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Student Modal */}
      <EditStudentNameModal student={studentToEdit} onClose={() => setStudentToEdit(null)} onSave={saveStudentName} />

      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa học sinh')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của học sinh{' '}
              <strong className="text-slate-900 font-bold">{studentToDelete.fullName}</strong>{' '}
              (Mã HS: <span className="font-mono text-blue-600 font-bold">{studentToDelete.studentId || 'N/A'}</span>{tr(')? Tài khoản này sẽ không thể đăng nhập vào hệ thống nữa.')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Assignment Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Hủy giao bài thi cho lớp {assignmentToDelete.classGroup}?
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn hủy giao bài thi{' '}
              <strong className="text-slate-900 font-semibold">"{assignmentToDelete.examTitle}"</strong> cho lớp {assignmentToDelete.classGroup}?
              Đề thi này sẽ không còn hiển thị trong mục bài tập được giao của học sinh lớp này.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Giữ lại')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAssignment}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận hủy')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
