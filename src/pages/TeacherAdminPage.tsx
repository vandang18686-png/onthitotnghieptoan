import React, { useState, useRef, useMemo, useEffect } from 'react';
import { tr, useLang } from '../i18n/LanguageContext';
import {
  Settings,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  BarChart3,
  Search,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Folder,
  Calendar,
  Clock,
  MoreVertical,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileDown,
  UploadCloud,
  Bell,
  Users,
  UserPlus,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  School,
  Briefcase,
  Menu,
} from 'lucide-react';
import { Exam, Announcement, ExamFolder, ExamResult, UserAccount, SchoolClass, ExamAssignment } from '../types/exam';
import { MathText } from '../components/MathText';
import { useAuth } from '../context/AuthContext';
import { formatQuestionCounts, INITIAL_FOLDERS } from '../utils/examUtils';
import { NewFolderModal } from '../components/NewFolderModal';
import { ExamEditorModal } from '../components/ExamEditorModal';
import { EditAnnouncementModal } from '../components/EditAnnouncementModal';
import { AccountManagementTab } from '../components/AccountManagementTab';
import { ClassManagementTab } from '../components/ClassManagementTab';
import { TeacherSidebar, TeacherTabKey } from '../components/TeacherSidebar';
import { HomeSettingsTab } from '../components/HomeSettingsTab';
import { ResultsTab } from '../components/ResultsTab';
import { HomeSettings } from '../types/exam';
import {
  subscribeToFolders,
  saveFolderToFirestore,
  deleteFolderFromFirestore,
  deleteExamFromFirestore,
} from '../services/firestoreService';

interface TeacherAdminPageProps {
  exams: Exam[];
  announcements: Announcement[];
  classes: SchoolClass[];
  assignments: ExamAssignment[];
  onBackToHome: () => void;
  onUpdateExams: (exams: Exam[]) => void;
  onDeleteExam?: (id: string) => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onSaveClass: (schoolClass: SchoolClass) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void>;
  onAddStudent: (studentAccount: UserAccount) => Promise<void>;
  onBatchAddStudents: (students: UserAccount[]) => Promise<void>;
  onAssignExam: (data: {
    examId: string;
    classNames: string[];
    deadline?: string;
    note?: string;
    isRequired?: boolean;
  }) => Promise<void>;
  onDeleteAssignment: (assignmentId: string) => Promise<void>;
  homeSettings: HomeSettings;
  onSaveHomeSettings: (s: HomeSettings) => Promise<void>;
  initialTab?: TeacherTabKey;
}

export const TeacherAdminPage: React.FC<TeacherAdminPageProps> = ({
  exams,
  announcements,
  classes,
  assignments,
  onBackToHome,
  onUpdateExams,
  onDeleteExam,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onSaveClass,
  onDeleteClass,
  onAddStudent,
  onBatchAddStudents,
  onAssignExam,
  onDeleteAssignment,
  homeSettings,
  onSaveHomeSettings,
  initialTab,
}) => {
  useLang();
  const { results, user, deleteExamResult, clearAllExamResults, accounts, createAccount, deleteAccount, updateAccount } = useAuth();

  // Active Tab & Sidebar State
  const [activeTab, setActiveTab] = useState<TeacherTabKey>(initialTab ?? 'management');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live dynamic badge counts for sidebar
  const badgeCounts = useMemo(() => ({
    management: exams.length,
    analytics: results.length,
    classes: classes.length,
    announcements: announcements.length,
    accounts: accounts.length,
  }), [exams.length, results.length, classes.length, announcements.length, accounts.length]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Exam result delete & filter state for in-app confirmation modal
  const [resultToDelete, setResultToDelete] = useState<ExamResult | null>(null);
  const [isClearAllResultsModalOpen, setIsClearAllResultsModalOpen] = useState(false);
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');

  const confirmExecuteDeleteResult = () => {
    if (!resultToDelete) return;
    const target = resultToDelete;
    deleteExamResult(target.id);
    setResultToDelete(null);
    showToast(`Đã xóa kết quả bài làm của thí sinh "${target.studentName}" thành công!`);
  };

  const confirmExecuteClearAllResults = () => {
    clearAllExamResults();
    setIsClearAllResultsModalOpen(false);
    showToast(tr('Đã xóa toàn bộ lịch sử làm bài của học sinh thành công!'));
  };

  const filteredResults = useMemo(() => {
    if (!resultsSearchTerm.trim()) return results;
    const term = resultsSearchTerm.toLowerCase();
    return results.filter(
      (r) =>
        r.studentName.toLowerCase().includes(term) ||
        r.sbd.toLowerCase().includes(term) ||
        (r.studentClass && r.studentClass.toLowerCase().includes(term)) ||
        r.examTitle.toLowerCase().includes(term)
    );
  }, [results, resultsSearchTerm]);

  // Folders State synced with Cloud Firestore
  const [folders, setFolders] = useState<ExamFolder[]>(INITIAL_FOLDERS);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ExamFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ExamFolder | null>(null);

  useEffect(() => {
    const unsub = subscribeToFolders(
      (cloudFolders) => {
        if (cloudFolders.length > 0) {
          setFolders(cloudFolders);
        }
      },
      (err) => console.error('Error subscribing to folders:', err)
    );
    return () => unsub();
  }, []);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  // Handle Delete Folder
  const confirmExecuteDeleteFolder = async () => {
    if (!folderToDelete) return;
    const targetId = folderToDelete.id;
    const targetName = folderToDelete.name;

    // 1. Remove folder from state and delete from Firestore
    setFolders((prev) => prev.filter((f) => f.id !== targetId));
    try {
      await deleteFolderFromFirestore(targetId);
    } catch (e) {
      console.error('Error deleting folder from Firestore:', e);
    }

    // 2. If any exams had this folderId, update their folderId
    const hasExamsInFolder = exams.some((e) => e.folderId === targetId);
    if (hasExamsInFolder) {
      const updatedExams = exams.map((e) =>
        e.folderId === targetId ? { ...e, folderId: undefined } : e
      );
      onUpdateExams(updatedExams);
    }

    // 3. Reset selected folder if currently viewing the deleted folder
    if (selectedFolderId === targetId) {
      setSelectedFolderId('all');
    }

    setFolderToDelete(null);
    showToast(`Đã xóa thư mục "${targetName}" thành công!`);
  };

  // Exam Editor Modal State (Create or Edit)
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingTargetExam, setEditingTargetExam] = useState<Exam | null>(null);

  // Table Sorting State
  const [sortColumn, setSortColumn] = useState<'title' | 'createdAt' | 'questions'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Active action menu row
  const [activeMenuExamId, setActiveMenuExamId] = useState<string | null>(null);

  // Carousel ref for smooth scrolling
  const carouselRef = useRef<HTMLDivElement>(null);

  // Success Notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Scroll Carousel Left/Right
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Handle Create New Folder
  const handleCreateFolder = async (newFolder: ExamFolder) => {
    setFolders((prev) => [...prev, newFolder]);
    try {
      await saveFolderToFirestore(newFolder);
    } catch (e) {
      console.error('Error saving folder to Firestore:', e);
    }
    showToast(`Đã tạo thư mục "${newFolder.name}" thành công!`);
  };

  // Handle Edit/Update Folder
  const handleUpdateFolder = async (updated: ExamFolder) => {
    setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    try {
      await saveFolderToFirestore(updated);
    } catch (e) {
      console.error('Error updating folder in Firestore:', e);
    }
    setEditingFolder(null);
    showToast(`Đã cập nhật chuyên đề "${updated.name}" thành công!`);
  };

  // Open Create Exam Modal
  const handleOpenCreateModal = () => {
    setEditingTargetExam(null);
    setIsExamModalOpen(true);
  };

  // Open Edit Exam Modal (pre-populates the exact exam data)
  const handleOpenEditModal = (exam: Exam) => {
    setEditingTargetExam(exam);
    setIsExamModalOpen(true);
    setActiveMenuExamId(null);
  };

  // Handle Save Exam (from Create or Edit modal)
  const handleSaveExam = (savedExam: Exam) => {
    const exists = exams.some((e) => e.id === savedExam.id);
    let updatedList: Exam[];

    if (exists) {
      // Edit mode: update in place
      updatedList = exams.map((e) => (e.id === savedExam.id ? savedExam : e));
      showToast(`Đã cập nhật đề thi "${savedExam.title}" thành công!`);
    } else {
      // Create mode: add to front
      updatedList = [savedExam, ...exams];
      showToast(`Đã tạo mới đề thi "${savedExam.title}" thành công!`);
    }

    onUpdateExams(updatedList);
    setIsExamModalOpen(false);
    setEditingTargetExam(null);
  };

  // Exam delete state for in-app confirmation modal
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Handle Delete Exam (opens custom confirmation modal)
  const handleDeleteExam = (exam: Exam) => {
    setActiveMenuExamId(null);
    setExamToDelete(exam);
  };

  const confirmExecuteDelete = async () => {
    if (!examToDelete) return;
    const target = examToDelete;
    const updatedList = exams.filter((e) => e.id !== target.id);
    onUpdateExams(updatedList);
    if (onDeleteExam) {
      onDeleteExam(target.id);
    }
    try {
      await deleteExamFromFirestore(target.id);
    } catch (e) {
      console.error('Error deleting exam from Firestore:', e);
    }
    setExamToDelete(null);
    showToast(`Đã xóa đề kiểm tra "${target.title}" thành công!`);
  };

  // Announcement delete state for in-app confirmation modal
  const [noticeToDelete, setNoticeToDelete] = useState<Announcement | null>(null);

  const confirmExecuteDeleteNotice = () => {
    if (!noticeToDelete) return;
    const target = noticeToDelete;
    if (onDeleteAnnouncement) {
      onDeleteAnnouncement(target.id);
    }
    setNoticeToDelete(null);
    showToast(`Đã xóa thông báo "${target.title}" thành công!`);
  };

  // Recommended Exams (Marked recommended or top 4 recent exams)
  const recommendedExams = useMemo(() => {
    return exams.filter((e) => e.isRecommended || true).slice(0, 5);
  }, [exams]);

  // Filtered and Sorted Exams for Table
  const filteredAndSortedExams = useMemo(() => {
    let result = exams.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.subject && e.subject.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchFolder =
        selectedFolderId === 'all' || e.folderId === selectedFolderId;

      return matchSearch && matchFolder;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'title') {
        cmp = a.title.localeCompare(b.title, 'vi');
      } else if (sortColumn === 'createdAt') {
        cmp = a.createdAt.localeCompare(b.createdAt);
      } else if (sortColumn === 'questions') {
        cmp = a.questions.length - b.questions.length;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [exams, searchTerm, selectedFolderId, sortColumn, sortDirection]);

  // Toggle Table Column Sort
  const handleSort = (column: 'title' | 'createdAt' | 'questions') => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Add announcement state
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeIsImportant, setNewNoticeIsImportant] = useState(true);
  const [editingNotice, setEditingNotice] = useState<Announcement | null>(null);

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;

    const ann: Announcement = {
      id: `ann-${Date.now()}`,
      title: newNoticeTitle.trim(),
      content: newNoticeContent.trim(),
      date: new Date().toLocaleDateString('vi-VN'),
      author: user?.fullName || 'Trường THPT Trần Hưng Đạo',
      isImportant: newNoticeIsImportant,
    };

    onAddAnnouncement(ann);
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setNewNoticeIsImportant(true);
    showToast(tr('Đã đăng thông báo mới thành công!'));
  };

  const handleSaveNotice = (updatedNotice: Announcement) => {
    if (onUpdateAnnouncement) {
      onUpdateAnnouncement(updatedNotice);
    }
    setEditingNotice(null);
    showToast(`Đã cập nhật thông báo "${updatedNotice.title}" thành công!`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand/50 flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Bar (Only visible on small screens < lg to open drawer) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title={tr('Mở menu quản trị')}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-soft text-brand border border-brand-soft flex items-center justify-center font-bold">
              <School className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              {tr('Quản trị giáo viên')}
            </span>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">
          {user?.fullName || 'Nguyễn Văn Đăng'}
        </div>
      </div>

      {/* Body with Sidebar and Main Content */}
      <div className="flex-1 flex flex-row relative min-h-screen">
        {/* Fixed / Collapsible Sidebar */}
        <TeacherSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          badgeCounts={badgeCounts}
          onBackToHome={onBackToHome}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          teacherName={user?.fullName || 'Nguyễn Văn Đăng'}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* =========================================================================
              TAB: QUẢN LÝ ĐỀ KIỂM TRA (CHÍNH)
             ========================================================================= */}
          {activeTab === 'management' && (
            <div className="space-y-6">
              {/* Top Toolbar: Search + Action Buttons */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search input by exam name */}
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={tr('Tìm kiếm theo tên đề, mã đề, môn học...')}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
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

                {/* Action Buttons: New Folder, Edit Selected Folder, Delete Selected Folder & New Exam */}
                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
                  {selectedFolder && (
                    <>
                      <button
                        onClick={() => {
                          setEditingFolder(selectedFolder);
                          setIsFolderModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-soft hover:bg-brand-soft text-brand text-xs font-semibold rounded-xl transition cursor-pointer border border-brand/25 shadow-2xs"
                        title={`Chỉnh sửa chuyên đề đang chọn: "${selectedFolder.name}"`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand" />
                        <span>{tr('Sửa chuyên đề')}</span>
                      </button>

                      <button
                        onClick={() => setFolderToDelete(selectedFolder)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-semibold rounded-xl transition cursor-pointer border border-red-200 shadow-2xs"
                        title={`Xóa chuyên đề đang chọn: "${selectedFolder.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>{tr('Xóa chuyên đề')}</span>
                      </button>
                    </>
                  )}

                  {/* Secondary Button: Tạo thư mục */}
                  <button
                    onClick={() => {
                      setEditingFolder(null);
                      setIsFolderModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer border border-slate-200 shadow-2xs"
                  >
                    <FolderPlus className="w-4 h-4 text-brand" />
                    <span>{tr('Tạo thư mục')}</span>
                  </button>

                  {/* Primary Purple Button: Tạo mới đề */}
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{tr('Tạo mới đề')}</span>
                  </button>
                </div>
              </div>

              {/* Professional Folder Navigation Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2 overflow-hidden">
                {/* Fixed Label Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-600 font-bold text-[11px] tracking-wide shrink-0 uppercase select-none border border-slate-200/50">
                  <Folder className="w-3.5 h-3.5 text-brand" />
                  <span>{tr('Thư mục')}</span>
                </div>

                <div className="h-5 w-px bg-slate-200 shrink-0 mx-0.5 hidden sm:block" />

                {/* Horizontal Scrollable Folder Pills */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5">
                  {/* "Tất cả" Pill */}
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId('all')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 ${
                      selectedFolderId === 'all'
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    <span>{tr('Tất cả')}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                        selectedFolderId === 'all'
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {exams.length}
                    </span>
                  </button>

                  {/* Individual Folder Pills */}
                  {folders.map((folder) => {
                    const count = exams.filter((e) => e.folderId === folder.id).length;
                    const isSelected = selectedFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        className={`group relative inline-flex items-center rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-brand text-white shadow-xs ring-1 ring-brand'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer"
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              folder.color || 'bg-purple-500'
                            } ${isSelected ? 'ring-2 ring-white/60' : ''}`}
                          />
                          <span className="truncate max-w-[220px] sm:max-w-[280px]">{folder.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {count}
                          </span>
                        </button>

                        {/* Actions: Edit & Delete (Subtle inline icons on hover) */}
                        <div
                          className={`flex items-center gap-0.5 pr-1.5 transition-opacity duration-150 ${
                            isSelected
                              ? 'opacity-80 group-hover:opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolder(folder);
                              setIsFolderModalOpen(true);
                            }}
                            title={`Chỉnh sửa "${folder.name}"`}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isSelected
                                ? 'text-white/80 hover:text-white hover:bg-white/20'
                                : 'text-slate-400 hover:text-brand hover:bg-brand-soft'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderToDelete(folder);
                            }}
                            title={`Xóa thư mục "${folder.name}"`}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isSelected
                                ? 'text-white/80 hover:text-white hover:bg-red-500/30'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* =========================================================================
                KHỐI "ĐƯỢC ĐỀ XUẤT" - DẠNG CAROUSEL CÁC ĐỀ GẦN ĐÂY
               ========================================================================= */}
            <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Được đề xuất (Đề thi gần đây)
                    </h2>
                    <p className="text-xs text-slate-500">
                      {tr('Các đề khảo sát trọng tâm vừa biên soạn và cập nhật')}
                    </p>
                  </div>
                </div>

                {/* Carousel Scroll Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
                    title={tr('Cuộn sang trái')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
                    title={tr('Cuộn sang phải')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Carousel Container */}
              <div
                ref={carouselRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {recommendedExams.map((exam) => {
                  const countsFormatted = formatQuestionCounts(exam.questions);

                  return (
                    <div
                      key={exam.id}
                      className="min-w-[290px] sm:min-w-[320px] max-w-[340px] bg-gradient-to-br from-slate-50 to-brand-soft/30 rounded-2xl border border-brand-soft p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between shrink-0 snap-start"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-md bg-brand-soft text-ink font-extrabold text-[11px] font-mono border border-brand/25">
                            Mã: {exam.code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            {tr('★ Đề xuất')}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-snug">
                          {exam.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {exam.description || 'Đề thi theo cấu trúc 3 phần chuẩn Bộ GD&ĐT'}
                        </p>

                        <div className="pt-2 border-t border-brand-soft/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-brand" />
                            <span>{exam.durationMinutes} phút</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-bold text-blue-700 font-mono">
                              {countsFormatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action buttons in card */}
                      <div className="pt-3 mt-3 border-t border-brand-soft flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(exam)}
                          className="flex-1 py-1.5 px-2.5 bg-white hover:bg-brand-soft text-brand border border-brand/25 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr('Sửa đề')}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer border border-transparent hover:border-red-200"
                          title={tr('Xóa đề')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* =========================================================================
                BẢNG "TẤT CẢ" LIỆT KÊ MỌI ĐỀ THI
               ========================================================================= */}
            <section className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand" />
                    Tất cả đề thi trong hệ thống ({filteredAndSortedExams.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tr('Bấm vào tiêu đề cột để sắp xếp thứ tự')}
                  </p>
                </div>
              </div>

              {filteredAndSortedExams.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-slate-600 text-sm font-semibold">
                    Không tìm thấy đề thi phù hợp với từ khóa "{searchTerm}".
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFolderId('all');
                    }}
                    className="text-xs text-brand font-bold hover:underline"
                  >
                    {tr('Xóa bộ lọc tìm kiếm')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                      <tr>
                        {/* Cột 1: Tên đề (sắp xếp được) */}
                        <th
                          onClick={() => handleSort('title')}
                          className="p-4 cursor-pointer hover:text-brand transition select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{tr('Tên đề kiểm tra')}</span>
                            {sortColumn === 'title' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-brand" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-brand" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Cột 2: Ngày tạo (sắp xếp được) */}
                        <th
                          onClick={() => handleSort('createdAt')}
                          className="p-4 cursor-pointer hover:text-brand transition select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{tr('Ngày tạo')}</span>
                            {sortColumn === 'createdAt' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-brand" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-brand" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Cột 3: Số câu (định dạng "12-4-6-0") */}
                        <th
                          onClick={() => handleSort('questions')}
                          className="p-4 text-center cursor-pointer hover:text-brand transition select-none"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{tr('Số câu (Định dạng)')}</span>
                            {sortColumn === 'questions' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-brand" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-brand" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Cột 4: Thao tác (Sửa đề / Xóa đề) */}
                        <th className="p-4 text-right">{tr('Thao tác')}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredAndSortedExams.map((exam) => {
                        const countsFormatted = formatQuestionCounts(exam.questions);

                        return (
                          <tr
                            key={exam.id}
                            className="hover:bg-brand-soft/30 transition group"
                          >
                            {/* Tên đề */}
                            <td className="p-4">
                              <div className="flex items-start gap-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px] shrink-0 border border-slate-200 mt-0.5">
                                  {exam.code}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                    {exam.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                    <span>{exam.subject}</span>
                                    <span>•</span>
                                    <span>{exam.durationMinutes} phút</span>
                                    {exam.folderName && (
                                      <>
                                        <span>•</span>
                                        <span className="text-brand font-semibold">
                                          📁 {exam.folderName}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Ngày tạo */}
                            <td className="p-4 text-slate-500 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{exam.createdAt}</span>
                              </div>
                            </td>

                            {/* Số câu (định dạng "12-4-6-0") */}
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-mono font-black text-xs border border-blue-200">
                                <span>{countsFormatted}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ({exam.questions.length} câu)
                              </div>
                            </td>

                            {/* Cột Thao tác: Sửa đề / Xóa đề */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(exam)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-soft hover:bg-brand-soft text-brand border border-brand/25 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs"
                                  title={tr('Chỉnh sửa đề thi này')}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>{tr('Sửa đề')}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteExam(exam)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition cursor-pointer"
                                  title={tr('Xóa đề thi này')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{tr('Xóa đề')}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB: THỐNG KÊ ĐIỂM HỌC SINH
           ========================================================================= */}
        {activeTab === 'homepage' && <HomeSettingsTab settings={homeSettings} onSave={onSaveHomeSettings} />}

        {activeTab === 'analytics' && (
          <ResultsTab
            results={results}
            exams={exams}
            students={accounts.filter((a) => a.role === 'student')}
            classes={classes}
            onDeleteResult={setResultToDelete}
            onClearAll={() => setIsClearAllResultsModalOpen(true)}
          />
        )}

        {/* =========================================================================
            TAB: QUẢN LÝ & ĐĂNG THÔNG BÁO
           ========================================================================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Form đăng thông báo mới */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {tr('Đăng thông báo mới cho thí sinh toàn hệ thống')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Thông báo sẽ lập tức hiển thị trên mục Thông Báo tại Trang Chủ của học sinh.')}
                  </p>
                </div>
              </div>

              <form onSubmit={handlePublishNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {tr('Tiêu đề thông báo:')}
                  </label>
                  <input
                    type="text"
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    placeholder={tr('VD: Lịch ôn tập chuyên đề Hình học Oxyz...')}
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {tr('Nội dung chi tiết:')}
                  </label>
                  <textarea
                    rows={3}
                    value={newNoticeContent}
                    onChange={(e) => setNewNoticeContent(e.target.value)}
                    placeholder={tr('Nhập nội dung hướng dẫn cho học sinh...')}
                    className="w-full p-4 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition leading-relaxed"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newNoticeIsImportant}
                      onChange={(e) => setNewNoticeIsImportant(e.target.checked)}
                      className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
                    />
                    <span>{tr('Đánh dấu là thông báo quan trọng')}</span>
                  </label>

                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-brand hover:bg-ink text-white text-xs font-bold rounded-xl shadow-md shadow-brand/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{tr('Đăng thông báo ngay')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Danh sách thông báo hiện có với nút Xóa */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Danh sách thông báo đang hiển thị ({announcements.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Thầy cô có thể xóa các thông báo hết hạn hoặc không còn áp dụng.')}
                  </p>
                </div>
              </div>

              {announcements.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                  <p className="text-sm font-semibold text-slate-600">{tr('Hiện chưa có thông báo nào')}</p>
                  <p className="text-xs text-slate-400 mt-1">{tr('Hãy tạo thông báo đầu tiên ở biểu mẫu phía trên.')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-brand/25 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">
                            {ann.title}
                          </h4>
                          {ann.isImportant && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {tr('Quan trọng')}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                          {ann.content}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ann.date}</span>
                          </span>
                          <span>•</span>
                          <span>{tr('Tác giả:')}<strong className="text-slate-600 font-semibold">{ann.author}</strong></span>
                        </div>
                      </div>

                      {/* Action buttons: Sửa & Xóa thông báo */}
                      <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingNotice(ann)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-xl transition cursor-pointer shadow-2xs"
                          title={tr('Sửa thông báo này')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr('Sửa thông báo')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoticeToDelete(ann)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition cursor-pointer shadow-2xs"
                          title={tr('Xóa thông báo này')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{tr('Xóa')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: QUẢN LÝ HỌC SINH THEO LỚP & GIAO BÀI (CLASSES)
           ========================================================================= */}
        {activeTab === 'classes' && (
          <ClassManagementTab
            classes={classes}
            accounts={accounts}
            exams={exams}
            assignments={assignments}
            results={results}
            currentUser={user}
            onSaveClass={onSaveClass}
            onDeleteClass={onDeleteClass}
            onAddStudent={onAddStudent}
            onBatchAddStudents={onBatchAddStudents}
            onDeleteStudent={deleteAccount}
            onUpdateStudent={updateAccount}
            onAssignExam={onAssignExam}
            onDeleteAssignment={onDeleteAssignment}
            showToast={showToast}
          />
        )}

        {/* =========================================================================
            TAB 4: QUẢN LÝ & TẠO TÀI KHOẢN (ACCOUNTS)
           ========================================================================= */}
        {activeTab === 'accounts' && (
          <AccountManagementTab
            accounts={accounts}
            currentUser={user}
            onCreateAccount={createAccount}
            onDeleteAccount={deleteAccount}
            showToast={showToast}
          />
        )}
        </main>
      </div>

      {/* Folder Modal (Create / Edit) */}
      <NewFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        editingFolder={editingFolder}
      />

      {/* Exam Editor Modal (Create or Edit) */}
      <ExamEditorModal
        isOpen={isExamModalOpen}
        onClose={() => {
          setIsExamModalOpen(false);
          setEditingTargetExam(null);
        }}
        initialExam={editingTargetExam}
        folders={folders}
        onSaveExam={handleSaveExam}
      />

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa đề kiểm tra')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa đề thi{' '}
              <strong className="text-slate-900 font-semibold">"{examToDelete.title}"</strong> (Mã đề: {examToDelete.code})?
              Toàn bộ {examToDelete.questions.length} câu hỏi và dữ liệu liên quan sẽ bị xóa hoàn toàn.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmExecuteDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Announcement Confirmation Modal */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa thông báo')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa thông báo{' '}
              <strong className="text-slate-900 font-semibold">"{noticeToDelete.title}"</strong>{tr('? Sau khi xóa, thông báo này sẽ lập tức được gỡ bỏ khỏi bảng tin Trang Chủ của học sinh.')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNoticeToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmExecuteDeleteNotice}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Exam Result Confirmation Modal */}
      {resultToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa kết quả bài làm')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa bài thi của thí sinh{' '}
              <strong className="text-slate-900 font-semibold">{resultToDelete.studentName}</strong>{' '}
              (SBD: <span className="font-mono text-blue-600 font-bold">{resultToDelete.sbd}</span>{tr(', Điểm:')}<span className="font-bold text-slate-900">{resultToDelete.totalScore.toFixed(2)}đ</span>{tr(') cho bài thi')}<em>"{resultToDelete.examTitle}"</em> nộp lúc {resultToDelete.submittedAt}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResultToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmExecuteDeleteResult}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Results Confirmation Modal */}
      {isClearAllResultsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xóa toàn bộ lịch sử làm bài?')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ <strong className="text-slate-900 font-bold">{results.length}</strong>{tr('bài làm của học sinh đã nộp? Sau khi xóa, bảng thống kê điểm và lịch sử thi sẽ được làm mới hoàn toàn. Thao tác này không thể hoàn tác.')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsClearAllResultsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmExecuteClearAllResults}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xóa toàn bộ')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {tr('Xác nhận xóa thư mục')}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa thư mục{' '}
              <strong className="text-slate-900 font-semibold">"{folderToDelete.name}"</strong>?
              {exams.some((e) => e.folderId === folderToDelete.id) ? (
                <span className="block mt-2 text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-left">
                  ⚠️ Lưu ý: Các đề thi trong thư mục này sẽ được chuyển sang mục "Tất cả" (Chưa phân loại) và không bị mất nội dung câu hỏi.
                </span>
              ) : (
                <span className="block mt-1 text-slate-400">
                  {tr('Thư mục này hiện chưa có đề kiểm tra nào.')}
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                {tr('Hủy bỏ')}
              </button>
              <button
                type="button"
                onClick={confirmExecuteDeleteFolder}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tr('Xác nhận xóa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Announcement Modal */}
      <EditAnnouncementModal
        isOpen={!!editingNotice}
        announcement={editingNotice}
        onClose={() => setEditingNotice(null)}
        onSave={handleSaveNotice}
      />
    </div>
  );
};
