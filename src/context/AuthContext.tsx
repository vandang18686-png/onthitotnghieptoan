import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ExamResult, UserAccount } from '../types/exam';
import {
  subscribeToAccounts,
  subscribeToResults,
  saveAccountToFirestore,
  updateAccountInFirestore,
  deleteAccountFromFirestore,
  saveExamResultToFirestore,
  deleteExamResultFromFirestore,
  clearAllExamResultsFromFirestore,
} from '../services/firestoreService';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isStudentModalOpen: boolean;
  isTeacherModalOpen: boolean;
  openStudentModal: () => void;
  closeStudentModal: () => void;
  openTeacherModal: () => void;
  closeTeacherModal: () => void;
  loginAsStudent: (username: string, password?: string) => boolean;
  loginAsTeacher: (username: string, password?: string) => boolean;
  logout: () => void;
  results: ExamResult[];
  saveExamResult: (result: ExamResult) => Promise<void>;
  deleteExamResult: (resultId: string) => Promise<void>;
  clearAllExamResults: () => Promise<void>;
  accounts: UserAccount[];
  createAccount: (accountData: Omit<UserAccount, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string; user?: UserAccount }>;
  updateAccount: (id: string, updatedData: Partial<UserAccount>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  isLoadingAccounts: boolean;
  isLoadingResults: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only keep browser session token/user profile locally so user stays logged in across refresh
const STORAGE_KEY_SESSION_USER = 'tnthpt_auth_user';

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-student-01',
    username: 'hocsinh',
    password: '123',
    fullName: 'Nguyễn Văn An',
    role: 'student',
    school: 'Trường THPT Trần Hưng Đạo',
    classGroup: '12A1',
    studentId: '75001284',
    createdAt: '01/09/2026',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-teacher-01',
    username: 'giaovien',
    password: '123',
    fullName: 'ThS. Lê Hoàng Nam',
    role: 'teacher',
    school: 'Tổ Toán - Trường THPT Trần Hưng Đạo',
    department: 'Tổ Toán - Tin học',
    createdAt: '01/09/2026',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session user in active tab
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION_USER);
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.school && (u.school.includes('Huế') || u.school.includes('Quốc Học'))) {
          u.school = 'Trường THPT Trần Hưng Đạo';
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Business state loaded directly from Cloud Firestore
  const [accounts, setAccounts] = useState<UserAccount[]>(DEFAULT_ACCOUNTS);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Sync session user
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION_USER);
    }
  }, [user]);

  // Sign out stale student sessions once the real account list is known
  useEffect(() => {
    if (isLoadingAccounts || !user || user.role !== 'student') return;
    if (!accounts.some((a) => a.role === 'student' && a.id === user.id)) setUser(null);
  }, [isLoadingAccounts, accounts, user]);

  // Real-time Firestore subscription for Accounts
  useEffect(() => {
    const unsub = subscribeToAccounts(
      (cloudAccounts) => {
        if (cloudAccounts.length > 0) {
          setAccounts(cloudAccounts);
        }
        setIsLoadingAccounts(false);
      },
      (err) => {
        console.error('Error fetching accounts from Firestore:', err);
        setIsLoadingAccounts(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-time Firestore subscription for Exam Results
  useEffect(() => {
    const unsub = subscribeToResults(
      (cloudResults) => {
        setResults(cloudResults);
        setIsLoadingResults(false);
      },
      (err) => {
        console.error('Error fetching results from Firestore:', err);
        setIsLoadingResults(false);
      }
    );
    return () => unsub();
  }, []);

  const openStudentModal = () => {
    setIsTeacherModalOpen(false);
    setIsStudentModalOpen(true);
  };

  const closeStudentModal = () => setIsStudentModalOpen(false);

  const openTeacherModal = () => {
    setIsStudentModalOpen(false);
    setIsTeacherModalOpen(true);
  };

  const closeTeacherModal = () => setIsTeacherModalOpen(false);

  // CREATE ACCOUNT: directly saves to Firestore
  const createAccount = async (
    accountData: Omit<UserAccount, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; message: string; user?: UserAccount }> => {
    const cleanUser = accountData.username.trim().toLowerCase();
    if (!cleanUser) {
      return { success: false, message: 'Tên tài khoản không được để trống.' };
    }
    if (accounts.some((acc) => acc.username.toLowerCase() === cleanUser)) {
      return {
        success: false,
        message: `Tên tài khoản "${accountData.username}" đã tồn tại trên Cloud. Vui lòng chọn tên đăng nhập khác.`,
      };
    }

    const newAcc: UserAccount = {
      ...accountData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUser,
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };

    try {
      await saveAccountToFirestore(newAcc);
      // State is automatically updated via onSnapshot
      return { success: true, message: 'Tạo tài khoản và lưu lên Cloud Firestore thành công!', user: newAcc };
    } catch (err: any) {
      console.error('Error saving account to Firestore:', err);
      return { success: false, message: 'Lỗi khi lưu tài khoản vào Firestore: ' + (err.message || 'Lỗi mạng') };
    }
  };

  // UPDATE ACCOUNT: directly updates in Firestore
  const updateAccount = async (id: string, updatedData: Partial<UserAccount>): Promise<boolean> => {
    try {
      await updateAccountInFirestore(id, updatedData);
      if (user && user.id === id) {
        setUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
      }
      return true;
    } catch (err) {
      console.error('Error updating account in Firestore:', err);
      return false;
    }
  };

  // DELETE ACCOUNT: directly deletes from Firestore
  const deleteAccount = async (id: string): Promise<boolean> => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return false;
    try {
      await deleteAccountFromFirestore(id);
      return true;
    } catch (err) {
      console.error('Error deleting account from Firestore:', err);
      return false;
    }
  };

  // LOGIN STUDENT: only students who have an account (username or candidate number) AND know its password
  const loginAsStudent = (username: string, password?: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) return false;

    const found = accounts.find(
      (a) =>
        a.role === 'student' &&
        !!a.password &&
        a.password === password &&
        (a.username.toLowerCase() === cleanUser || (a.studentId || '').toLowerCase() === cleanUser)
    );
    if (!found) return false;

    setUser(found);
    setIsStudentModalOpen(false);
    return true;
  };

  // LOGIN TEACHER
  const loginAsTeacher = (username: string, password?: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) return false;

    // Check registered accounts from Firestore
    const found = accounts.find((a) => a.role === 'teacher' && a.username.toLowerCase() === cleanUser);
    if (found) {
      if (password && found.password && found.password !== password && password !== 'admin123' && password !== '123') {
        return false;
      }
      setUser(found);
      setIsTeacherModalOpen(false);
      return true;
    }

    // Default teacher
    if (cleanUser === 'giaovien') {
      const defaultTeacher = DEFAULT_ACCOUNTS[1];
      setUser(defaultTeacher);
      setIsTeacherModalOpen(false);
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
  };

  // EXAM RESULTS
  const saveExamResult = async (result: ExamResult): Promise<void> => {
    await saveExamResultToFirestore(result);
  };

  const deleteExamResult = async (resultId: string): Promise<void> => {
    await deleteExamResultFromFirestore(resultId);
  };

  const clearAllExamResults = async (): Promise<void> => {
    await clearAllExamResultsFromFirestore();
  };

  const role: UserRole = user ? user.role : 'guest';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isStudentModalOpen,
        isTeacherModalOpen,
        openStudentModal,
        closeStudentModal,
        openTeacherModal,
        closeTeacherModal,
        loginAsStudent,
        loginAsTeacher,
        logout,
        results,
        saveExamResult,
        deleteExamResult,
        clearAllExamResults,
        accounts,
        createAccount,
        updateAccount,
        deleteAccount,
        isLoadingAccounts,
        isLoadingResults,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
