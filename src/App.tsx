import React, { useState, useEffect, useMemo } from 'react';
import { useLang } from './i18n/LanguageContext';
import { DEFAULT_HOME_SETTINGS, ACCENTS, mergeHomeSettings, pick } from './data/homeSettings';
import { HomeSettings } from './types/exam';
import type { TeacherTabKey } from './components/TeacherSidebar';
import { localizeExam, localizeAnnouncement } from './i18n/localize';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StudentLoginModal } from './components/StudentLoginModal';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { CloudSyncIndicator } from './components/CloudSyncIndicator';
import { HomePage } from './pages/HomePage';
import { ExamPage } from './pages/ExamPage';
import { ResultPage } from './pages/ResultPage';
import { TeacherAdminPage } from './pages/TeacherAdminPage';
import { MOCK_EXAMS, MOCK_ANNOUNCEMENTS } from './data/mockExams';
import { INITIAL_FOLDERS } from './utils/examUtils';
import { DEFAULT_ACCOUNTS } from './context/AuthContext';
import { Exam, ExamResult, Announcement, SchoolClass, ExamAssignment, UserAccount } from './types/exam';
import {
  subscribeToExams,
  subscribeToAnnouncements,
  subscribeToHomeSettings,
  saveHomeSettingsToFirestore,
  subscribeToClasses,
  saveClassToFirestore,
  deleteClassFromFirestore,
  subscribeToAssignments,
  saveAssignmentToFirestore,
  deleteAssignmentFromFirestore,
  batchCreateAccounts,
  saveAccountToFirestore,
  saveExamToFirestore,
  deleteExamFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  runMigrationIfNeeded,
} from './services/firestoreService';

function AppContent() {
  const { role, user, saveExamResult, openStudentModal, openTeacherModal } = useAuth();

  const [currentView, setCurrentView] = useState<'home' | 'exam' | 'result' | 'teacher_admin'>('home');
  const [exams, setExams] = useState<Exam[]>(MOCK_EXAMS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);

  const { lang } = useLang();
  const [homeSettings, setHomeSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [adminInitialTab, setAdminInitialTab] = useState<TeacherTabKey | undefined>(undefined);
  useEffect(() => {
    const a = ACCENTS[homeSettings.accent] ?? ACCENTS.teal;
    document.documentElement.style.setProperty('--color-brand', a.brand);
    document.documentElement.style.setProperty('--color-brand-soft', a.soft);
  }, [homeSettings.accent]);
  const handleSaveHomeSettings = async (s: HomeSettings) => { await saveHomeSettingsToFirestore(s); setHomeSettings(s); };
  const handleEditHome = () => { setAdminInitialTab('homepage'); setCurrentView('teacher_admin'); };
  const localExams = useMemo(() => exams.map((e) => localizeExam(e, lang)), [exams, lang]);
  const localAnnouncements = useMemo(() => announcements.map((a) => localizeAnnouncement(a, lang)), [announcements, lang]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);

  // Initialize and run cloud migration if needed
  useEffect(() => {
    let isMounted = true;
    runMigrationIfNeeded(MOCK_EXAMS, MOCK_ANNOUNCEMENTS, INITIAL_FOLDERS, DEFAULT_ACCOUNTS)
      .then((migrated) => {
        if (migrated) {
          console.log('[Cloud Firestore] Data migration completed successfully.');
        }
      })
      .catch((err) => {
        console.error('[Cloud Firestore] Initial migration check error:', err);
      });

    // Real-time listener for Exams from Firestore
    const unsubExams = subscribeToExams(
      (cloudExams) => {
        if (isMounted && cloudExams.length > 0) {
          setExams(cloudExams);
        }
      },
      (err) => console.error('Error in exam subscription:', err)
    );

    // Real-time listener for Announcements from Firestore
    const unsubAnnouncements = subscribeToAnnouncements(
      (cloudAnnouncements) => {
        if (isMounted && cloudAnnouncements.length > 0) {
          setAnnouncements(cloudAnnouncements);
        }
      },
      (err) => console.error('Error in announcement subscription:', err)
    );

    const unsubHome = subscribeToHomeSettings(
      (cloud) => { if (isMounted) setHomeSettings(mergeHomeSettings(cloud)); },
      (err) => console.error('Error in home settings subscription:', err)
    );

    // Real-time listener for Classes from Firestore
    const unsubClasses = subscribeToClasses(
      (cloudClasses) => {
        if (isMounted) {
          // Show exactly what is stored; sample classes are never written back automatically
          setClasses(cloudClasses);
        }
      },
      (err) => console.error('Error in classes subscription:', err)
    );

    // Real-time listener for Assignments from Firestore
    const unsubAssignments = subscribeToAssignments(
      (cloudAssignments) => {
        if (isMounted) {
          setAssignments(cloudAssignments);
        }
      },
      (err) => console.error('Error in assignments subscription:', err)
    );

    return () => {
      isMounted = false;
      unsubExams();
      unsubAnnouncements();
      unsubHome();
      unsubClasses();
      unsubAssignments();
    };
  }, []);

  // Automatically navigate to Teacher Exam Management immediately upon teacher login
  useEffect(() => {
    if (role === 'teacher' && currentView !== 'teacher_admin') {
      setCurrentView('teacher_admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (role === 'guest' && currentView === 'teacher_admin') {
      setCurrentView('home');
    }
  }, [role]);

  // Handle Exam updates directly to Firestore
  const handleUpdateExams = async (newExams: Exam[]) => {
    setExams(newExams);
    try {
      for (const ex of newExams) {
        await saveExamToFirestore(ex);
      }
    } catch (e) {
      console.error('Error saving exams to Firestore:', e);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setExams((prev) => prev.filter((e) => e.id !== examId));
    try {
      await deleteExamFromFirestore(examId);
    } catch (e) {
      console.error('Error deleting exam from Firestore:', e);
    }
  };

  // Route Guard: Handle selecting an exam
  const handleSelectExam = (exam: Exam) => {
    if (role === 'teacher') {
      alert('Tài khoản Giáo viên chỉ có quyền quản trị và xem thống kê, không sử dụng giao diện làm bài thi của học sinh.');
      return;
    }
    if (role === 'guest') {
      openStudentModal();
      return;
    }

    setActiveExam(exam);
    setCurrentView('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Guard: Handle navigating to Teacher Admin
  const handleNavigateTeacherAdmin = () => {
    if (role !== 'teacher') {
      openTeacherModal();
      return;
    }
    setAdminInitialTab(undefined);
    setCurrentView('teacher_admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Exam Submission (saves directly to Firestore via AuthContext)
  const handleSubmitExam = async (result: ExamResult) => {
    await saveExamResult({ ...result, examTitle: activeExam?.title ?? result.examTitle });
    setCurrentResult(result);
    setCurrentView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Retake Exam
  const handleRetakeExam = () => {
    if (activeExam) {
      setCurrentView('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentView('home');
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Announcements directly to Firestore
  const handleAddAnnouncement = async (ann: Announcement) => {
    setAnnouncements((prev) => [ann, ...prev]);
    try {
      await saveAnnouncementToFirestore(ann);
    } catch (e) {
      console.error('Error saving announcement to Firestore:', e);
    }
  };

  const handleUpdateAnnouncement = async (updatedAnnouncement: Announcement) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === updatedAnnouncement.id ? updatedAnnouncement : a))
    );
    try {
      await saveAnnouncementToFirestore(updatedAnnouncement);
    } catch (e) {
      console.error('Error updating announcement to Firestore:', e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAnnouncementFromFirestore(id);
    } catch (e) {
      console.error('Error deleting announcement from Firestore:', e);
    }
  };

  // Handle Classes CRUD
  const handleSaveClass = async (schoolClass: SchoolClass) => {
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === schoolClass.id);
      return exists ? prev.map((c) => (c.id === schoolClass.id ? schoolClass : c)) : [...prev, schoolClass];
    });
    try {
      await saveClassToFirestore(schoolClass);
    } catch (e) {
      console.error('Error saving class to Firestore:', e);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));
    try {
      await deleteClassFromFirestore(classId);
    } catch (e) {
      console.error('Error deleting class from Firestore:', e);
    }
  };

  // Handle Adding Student
  const handleAddStudent = async (studentAccount: UserAccount) => {
    try {
      await saveAccountToFirestore(studentAccount);
    } catch (e) {
      console.error('Error adding student to Firestore:', e);
    }
  };

  // Handle Batch Students from Excel
  const handleBatchAddStudents = async (newStudents: UserAccount[]) => {
    try {
      await batchCreateAccounts(newStudents);
    } catch (e) {
      console.error('Error batch adding students to Firestore:', e);
    }
  };

  // Handle Assigning Exam to Classes
  const handleAssignExam = async (data: {
    examId: string;
    classNames: string[];
    deadline?: string;
    note?: string;
    isRequired?: boolean;
  }) => {
    const targetExam = exams.find((e) => e.id === data.examId);
    if (!targetExam) return;

    for (const cName of data.classNames) {
      const assignId = `assign-${targetExam.id}-${cName}-${Date.now()}`;
      const newAssign: ExamAssignment = {
        id: assignId,
        examId: targetExam.id,
        examTitle: targetExam.title,
        examCode: targetExam.code,
        classGroup: cName,
        assignedByTeacherName: user?.fullName || 'Giáo viên bộ môn',
        assignedAt: new Date().toLocaleDateString('vi-VN'),
        deadline: data.deadline,
        note: data.note,
        isRequired: data.isRequired !== false,
      };

      await saveAssignmentToFirestore(newAssign);
    }

    // Update assignedClasses array on the exam
    const currentAssigned = new Set(targetExam.assignedClasses || []);
    data.classNames.forEach((c) => currentAssigned.add(c));

    const updatedExam: Exam = {
      ...targetExam,
      assignedClasses: Array.from(currentAssigned),
      assignmentDeadline: data.deadline,
      assignmentNote: data.note,
    };

    await saveExamToFirestore(updatedExam);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    try {
      await deleteAssignmentFromFirestore(assignmentId);
    } catch (e) {
      console.error('Error deleting assignment from Firestore:', e);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Cloud Sync Status Indicator Bar */}
      <CloudSyncIndicator />

      {/* Global Navbar (Header in exam page has its own dedicated exam toolbar) */}
      {currentView !== 'exam' && (
        <Navbar
          onNavigateHome={handleBackToHome}
          onNavigateTeacherAdmin={handleNavigateTeacherAdmin}
          currentView={currentView}
          brand={pick(homeSettings.brand, lang)}
          school={pick(homeSettings.school, lang)}
        />
      )}

      {/* View Routing */}
      {currentView === 'home' && (
        <HomePage
          exams={localExams}
          announcements={localAnnouncements}
          assignments={assignments}
          onSelectExam={handleSelectExam}
          onNavigateTeacherAdmin={handleNavigateTeacherAdmin}
          onUpdateAnnouncement={handleUpdateAnnouncement}
          settings={homeSettings}
          onEditHome={handleEditHome}
        />
      )}

      {currentView === 'exam' && activeExam && (
        <ExamPage
          exam={localizeExam(activeExam, lang)}
          onBackToHome={handleBackToHome}
          onSubmitExam={handleSubmitExam}
        />
      )}

      {currentView === 'result' && activeExam && currentResult && (
        <ResultPage
          exam={localizeExam(activeExam, lang)}
          result={currentResult}
          onRetakeExam={handleRetakeExam}
          onBackToHome={handleBackToHome}
        />
      )}

      {currentView === 'teacher_admin' && (
        <TeacherAdminPage
          homeSettings={homeSettings}
          onSaveHomeSettings={handleSaveHomeSettings}
          initialTab={adminInitialTab}
          exams={exams}
          announcements={announcements}
          classes={classes}
          assignments={assignments}
          onBackToHome={handleBackToHome}
          onUpdateExams={handleUpdateExams}
          onDeleteExam={handleDeleteExam}
          onAddAnnouncement={handleAddAnnouncement}
          onUpdateAnnouncement={handleUpdateAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onSaveClass={handleSaveClass}
          onDeleteClass={handleDeleteClass}
          onAddStudent={handleAddStudent}
          onBatchAddStudents={handleBatchAddStudents}
          onAssignExam={handleAssignExam}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}

      {/* Global Modals */}
      <StudentLoginModal />
      <TeacherLoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
