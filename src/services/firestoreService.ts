import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { HomeSettings, Exam, Announcement, ExamFolder, ExamResult, UserAccount, SchoolClass, ExamAssignment } from '../types/exam';

// Helper to remove undefined fields because Firestore throws an error on undefined values
export function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}

// Collection names in Firestore
export const COLLECTIONS = {
  EXAMS: 'exams',
  ANNOUNCEMENTS: 'announcements',
  FOLDERS: 'exam_folders',
  ACCOUNTS: 'user_accounts',
  RESULTS: 'exam_results',
  CLASSES: 'school_classes',
  ASSIGNMENTS: 'exam_assignments',
  METADATA: 'system_metadata',
  SETTINGS: 'site_settings',
} as const;

// Legacy localStorage keys to migrate and clean up
export const LEGACY_STORAGE_KEYS = {
  EXAMS: 'thpt_hue_custom_exams',
  ANNOUNCEMENTS: 'thpt_hue_announcements',
  FOLDERS: 'tnthpt_exam_folders',
  ACCOUNTS: 'tnthpt_registered_accounts',
  RESULTS: 'tnthpt_exam_results',
  LEGACY_USER: 'tnthpt_auth_user',
} as const;

export interface CloudStatus {
  isConnected: boolean;
  isMigrated: boolean;
  isMigrating: boolean;
  lastSyncTime: Date | null;
  error: string | null;
}

let cloudStatusListeners: ((status: CloudStatus) => void)[] = [];
let currentCloudStatus: CloudStatus = {
  isConnected: false,
  isMigrated: false,
  isMigrating: false,
  lastSyncTime: null,
  error: null,
};

export function updateCloudStatus(patch: Partial<CloudStatus>) {
  currentCloudStatus = { ...currentCloudStatus, ...patch };
  cloudStatusListeners.forEach((fn) => fn(currentCloudStatus));
}

export function subscribeCloudStatus(listener: (status: CloudStatus) => void): () => void {
  cloudStatusListeners.push(listener);
  listener(currentCloudStatus);
  return () => {
    cloudStatusListeners = cloudStatusListeners.filter((l) => l !== listener);
  };
}

export function getCloudStatus(): CloudStatus {
  return currentCloudStatus;
}

// ==========================================
// MIGRATION SERVICE
// ==========================================
export async function runMigrationIfNeeded(
  defaultExams: Exam[],
  defaultAnnouncements: Announcement[],
  defaultFolders: ExamFolder[],
  defaultAccounts: UserAccount[]
): Promise<boolean> {
  try {
    // Only clear old errors here; the "migrating" banner is shown only if a real migration is needed
    updateCloudStatus({ error: null });

    const metaRef = doc(db, COLLECTIONS.METADATA, 'migration_info');
    const metaSnap = await getDoc(metaRef);

    // Also check if exams collection already has data
    const examsSnap = await getDocs(collection(db, COLLECTIONS.EXAMS));
    const alreadyHasData = !examsSnap.empty;

    if (metaSnap.exists() && metaSnap.data()?.completed && alreadyHasData) {
      updateCloudStatus({
        isConnected: true,
        isMigrated: true,
        isMigrating: false,
        lastSyncTime: new Date(),
      });
      return false; // Already migrated
    }

    updateCloudStatus({ isMigrating: true });
    console.log('[Firestore] Initiating data migration to Cloud Firestore...');

    // 1. Read legacy data from localStorage or use defaults
    let examsToMigrate: Exam[] = defaultExams;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.EXAMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) examsToMigrate = parsed;
      }
    } catch (e) {
      console.warn('Could not read legacy exams from localStorage:', e);
    }

    let announcementsToMigrate: Announcement[] = defaultAnnouncements;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.ANNOUNCEMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) announcementsToMigrate = parsed;
      }
    } catch (e) {
      console.warn('Could not read legacy announcements from localStorage:', e);
    }

    let foldersToMigrate: ExamFolder[] = defaultFolders;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.FOLDERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) foldersToMigrate = parsed;
      }
    } catch (e) {
      console.warn('Could not read legacy folders from localStorage:', e);
    }

    let accountsToMigrate: UserAccount[] = defaultAccounts;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.ACCOUNTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) accountsToMigrate = parsed;
      }
    } catch (e) {
      console.warn('Could not read legacy accounts from localStorage:', e);
    }

    let resultsToMigrate: ExamResult[] = [];
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEYS.RESULTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) resultsToMigrate = parsed;
      }
    } catch (e) {
      console.warn('Could not read legacy results from localStorage:', e);
    }

    // 2. Batch write to Firestore
    // Batch 1: Folders, Announcements, Accounts
    const batch1 = writeBatch(db);
    foldersToMigrate.forEach((f) => {
      batch1.set(doc(db, COLLECTIONS.FOLDERS, f.id), sanitizeForFirestore(f));
    });
    announcementsToMigrate.forEach((a) => {
      batch1.set(doc(db, COLLECTIONS.ANNOUNCEMENTS, a.id), sanitizeForFirestore(a));
    });
    accountsToMigrate.forEach((acc) => {
      batch1.set(doc(db, COLLECTIONS.ACCOUNTS, acc.id), sanitizeForFirestore(acc));
    });
    resultsToMigrate.forEach((res) => {
      batch1.set(doc(db, COLLECTIONS.RESULTS, res.id), sanitizeForFirestore(res));
    });
    await batch1.commit();

    // Batch 2: Exams (individually or batch to avoid batch limits)
    for (const exam of examsToMigrate) {
      await setDoc(doc(db, COLLECTIONS.EXAMS, exam.id), sanitizeForFirestore(exam));
    }

    // 3. Mark migration completed in Firestore
    await setDoc(metaRef, {
      completed: true,
      migratedAt: new Date().toISOString(),
      counts: {
        exams: examsToMigrate.length,
        announcements: announcementsToMigrate.length,
        folders: foldersToMigrate.length,
        accounts: accountsToMigrate.length,
        results: resultsToMigrate.length,
      },
    });

    // 4. Remove business data from localStorage to ensure Cloud is the single source of truth
    localStorage.removeItem(LEGACY_STORAGE_KEYS.EXAMS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.FOLDERS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.RESULTS);

    updateCloudStatus({
      isConnected: true,
      isMigrated: true,
      isMigrating: false,
      lastSyncTime: new Date(),
      error: null,
    });

    console.log('[Firestore] Migration to Cloud Firestore completed successfully!');
    return true;
  } catch (error: any) {
    console.error('[Firestore] Migration error:', error);
    updateCloudStatus({
      isConnected: false,
      isMigrating: false,
      error: error?.message || 'Không thể kết nối hoặc chuyển dữ liệu lên Cloud Firestore.',
    });
    throw error;
  }
}

// ==========================================
// REAL-TIME SUBSCRIBERS
// ==========================================

export function subscribeToExams(
  onData: (exams: Exam[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.EXAMS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Exam[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Exam);
      });
      // Sort exams by creation date or id descending
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToExams error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với cơ sở dữ liệu đề thi trên Cloud.' });
      onError(err);
    }
  );
}

export function subscribeToAnnouncements(
  onData: (announcements: Announcement[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.ANNOUNCEMENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Announcement);
      });
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToAnnouncements error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với cơ sở dữ liệu thông báo trên Cloud.' });
      onError(err);
    }
  );
}

export function subscribeToFolders(
  onData: (folders: ExamFolder[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.FOLDERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExamFolder[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExamFolder);
      });
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToFolders error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với cơ sở dữ liệu thư mục trên Cloud.' });
      onError(err);
    }
  );
}

export function subscribeToAccounts(
  onData: (accounts: UserAccount[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.ACCOUNTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as UserAccount);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToAccounts error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với cơ sở dữ liệu tài khoản trên Cloud.' });
      onError(err);
    }
  );
}

export function subscribeToResults(
  onData: (results: ExamResult[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.RESULTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExamResult[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExamResult);
      });
      // Sort newest results first
      list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToResults error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với cơ sở dữ liệu kết quả thi trên Cloud.' });
      onError(err);
    }
  );
}

// ==========================================
// DIRECT CRUD ACTIONS ON FIRESTORE
// ==========================================

// Exams
export async function saveExamToFirestore(exam: Exam): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EXAMS, exam.id);
  await setDoc(docRef, sanitizeForFirestore(exam));
}

export async function deleteExamFromFirestore(examId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EXAMS, examId);
  await deleteDoc(docRef);
}

// Announcements
export async function saveAnnouncementToFirestore(announcement: Announcement): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, announcement.id);
  await setDoc(docRef, sanitizeForFirestore(announcement));
}

export async function deleteAnnouncementFromFirestore(announcementId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId);
  await deleteDoc(docRef);
}

// Folders
export async function saveFolderToFirestore(folder: ExamFolder): Promise<void> {
  const docRef = doc(db, COLLECTIONS.FOLDERS, folder.id);
  await setDoc(docRef, sanitizeForFirestore(folder));
}

export async function deleteFolderFromFirestore(folderId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.FOLDERS, folderId);
  await deleteDoc(docRef);
}

// Accounts
export async function saveAccountToFirestore(account: UserAccount): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ACCOUNTS, account.id);
  await setDoc(docRef, sanitizeForFirestore(account));
}

export async function updateAccountInFirestore(id: string, updates: Partial<UserAccount>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ACCOUNTS, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const merged = { ...snap.data(), ...updates };
    await setDoc(docRef, sanitizeForFirestore(merged));
  }
}

export async function deleteAccountFromFirestore(accountId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ACCOUNTS, accountId);
  await deleteDoc(docRef);
}

// Results
export async function saveExamResultToFirestore(result: ExamResult): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RESULTS, result.id);
  await setDoc(docRef, sanitizeForFirestore(result));
}

export async function deleteExamResultFromFirestore(resultId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RESULTS, resultId);
  await deleteDoc(docRef);
}

export async function clearAllExamResultsFromFirestore(): Promise<void> {
  const snap = await getDocs(collection(db, COLLECTIONS.RESULTS));
  const batch = writeBatch(db);
  snap.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}

// ==========================================
// CLASSES (QUẢN LÝ LỚP HỌC)
// ==========================================
export function subscribeToClasses(
  onData: (classes: SchoolClass[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.CLASSES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SchoolClass[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as SchoolClass);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToClasses error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với dữ liệu lớp học trên Cloud.' });
      onError(err);
    }
  );
}

export async function saveClassToFirestore(schoolClass: SchoolClass): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CLASSES, schoolClass.id);
  await setDoc(docRef, sanitizeForFirestore(schoolClass));
}

export async function deleteClassFromFirestore(classId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CLASSES, classId);
  await deleteDoc(docRef);
}

// ==========================================
// ASSIGNMENTS (GIAO BÀI THEO LỚP)
// ==========================================
export function subscribeToAssignments(
  onData: (assignments: ExamAssignment[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.ASSIGNMENTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExamAssignment[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExamAssignment);
      });
      list.sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''));
      updateCloudStatus({ isConnected: true, lastSyncTime: new Date(), error: null });
      onData(list);
    },
    (err) => {
      console.error('[Firestore] subscribeToAssignments error:', err);
      updateCloudStatus({ isConnected: false, error: 'Mất kết nối với dữ liệu giao bài trên Cloud.' });
      onError(err);
    }
  );
}

export async function saveAssignmentToFirestore(assignment: ExamAssignment): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, assignment.id);
  await setDoc(docRef, sanitizeForFirestore(assignment));
}

export async function deleteAssignmentFromFirestore(assignmentId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, assignmentId);
  await deleteDoc(docRef);
}

// ==========================================
// BATCH ACCOUNT CREATION (NHẬP HỌC SINH TỪ EXCEL / THỦ CÔNG)
// ==========================================
export async function batchCreateAccounts(newAccounts: UserAccount[]): Promise<{ count: number }> {
  if (!newAccounts || newAccounts.length === 0) return { count: 0 };
  
  // Firestore batches allow up to 500 ops per batch
  const chunkSize = 450;
  for (let i = 0; i < newAccounts.length; i += chunkSize) {
    const chunk = newAccounts.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((acc) => {
      const docRef = doc(db, COLLECTIONS.ACCOUNTS, acc.id);
      batch.set(docRef, sanitizeForFirestore(acc));
    });
    await batch.commit();
  }

  return { count: newAccounts.length };
}

// Home page settings (single document: site_settings/home)
export function subscribeToHomeSettings(onData: (s: HomeSettings | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, 'home'),
    (snap) => onData(snap.exists() ? (snap.data() as HomeSettings) : null),
    (err) => { console.error('[Firestore] subscribeToHomeSettings error:', err); onError(err); }
  );
}
export async function saveHomeSettingsToFirestore(settings: HomeSettings): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'home'), sanitizeForFirestore(settings));
}
