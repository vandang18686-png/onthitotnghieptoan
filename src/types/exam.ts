export type UserRole = 'guest' | 'student' | 'teacher';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  school?: string;
  classGroup?: string;
  studentId?: string; // Số báo danh
  avatarUrl?: string;
}

export interface UserAccount extends UserProfile {
  password?: string;
  createdAt?: string;
  department?: string; // Tổ chuyên môn/bộ môn cho giáo viên
}

export interface SchoolClass {
  id: string; // e.g. "class-12a1" or "12A1"
  name: string; // e.g. "12A1"
  grade: number; // 12
  academicYear: string; // "2026-2027"
  homeroomTeacher?: string; // Giáo viên chủ nhiệm
  studentCount?: number;
  description?: string;
  createdAt: string;
}

export interface ExamAssignment {
  id: string; // e.g. "assign-..."
  examId: string;
  examTitle: string;
  examCode: string;
  classGroup: string; // e.g. "12A1"
  assignedByTeacherName: string;
  assignedAt: string;
  deadline?: string; // ISO string or YYYY-MM-DDTHH:mm
  note?: string; // Lời dặn dò của giáo viên
  isRequired?: boolean; // Bắt buộc hay luyện tập
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface MultipleChoiceOption {
  id: 'A' | 'B' | 'C' | 'D';
  content: string; // May contain LaTeX $...$
}

export interface TrueFalseStatement {
  id: 'a' | 'b' | 'c' | 'd';
  content: string; // May contain LaTeX $...$
  correctAnswer: boolean;
}

export interface Question {
  id: string;
  section: 1 | 2 | 3; // 1: Trắc nghiệm 4 lựa chọn, 2: Đúng/Sai, 3: Trả lời ngắn
  orderNumber: number; // 1 to 22
  type: QuestionType;
  title: string; // Question text with LaTeX
  imageUrl?: string; // Embedded diagram, graph, variation table (bảng biến thiên), or figure
  imageCaption?: string;
  options?: MultipleChoiceOption[]; // For section 1
  correctOption?: 'A' | 'B' | 'C' | 'D'; // For section 1
  statements?: TrueFalseStatement[]; // For section 2
  correctShortAnswer?: string; // For section 3 (e.g., "3", "0.5", "-4")
  acceptedAnswers?: string[]; // Variations for numerical tolerance
  explanation?: string; // Detailed step-by-step solution with LaTeX
  topic?: string;
  difficulty?: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
}

export interface ExamFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  examCount?: number;
}

export interface Exam {
  id: string;
  code: string; // e.g., "101", "102"
  title: string;
  subtitle?: string;
  grade: number; // 12
  subject: string; // Toán học
  year: string; // "2026-2027"
  durationMinutes: number; // 50
  totalQuestions: number; // 22
  maxScore: number; // 10.0
  description?: string;
  createdAt: string;
  folderId?: string; // ID of folder
  folderName?: string;
  isRecommended?: boolean;
  assignedClasses?: string[]; // e.g. ["12A1", "12A2"]
  assignmentDeadline?: string; // Hạn nộp bài
  assignmentNote?: string; // Ghi chú dặn dò
  questions: Question[];
  en?: ExamTranslation;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  isImportant?: boolean;
  en?: AnnouncementTranslation;
}

export interface StudentAnswers {
  [questionId: string]: {
    // Section 1: single choice 'A' | 'B' | 'C' | 'D'
    selectedOption?: 'A' | 'B' | 'C' | 'D';
    // Section 2: a/b/c/d true/false
    statements?: {
      a?: boolean;
      b?: boolean;
      c?: boolean;
      d?: boolean;
    };
    // Section 3: short answer string
    shortAnswer?: string;
  };
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  sbd: string;
  submittedAt: string;
  timeSpentSeconds: number;
  totalScore: number; // On 10.0 scale
  section1Score: number; // Max 3.0
  section2Score: number; // Max 4.0
  section3Score: number; // Max 3.0
  section1CorrectCount: number; // Out of 12
  section2CorrectItemsCount: number; // Out of 16 sub-statements
  section3CorrectCount: number; // Out of 6
  studentAnswers: StudentAnswers;
}

/** Optional English translation. Any missing field falls back to the Vietnamese original. */
export interface ExamTranslation {
  title?: string; subtitle?: string; description?: string; subject?: string;
  questions?: Record<string, {
    title?: string; explanation?: string;
    options?: Record<string, string>; statements?: Record<string, string>;
  }>;
}
export interface AnnouncementTranslation { title?: string; content?: string; author?: string }

export interface BiText { vi: string; en: string }
export type AccentKey = 'teal' | 'blue' | 'emerald' | 'violet' | 'rose';
/** Editable content of the public home page (managed from the teacher admin "Home page" tab). */
export interface HomeSettings {
  eyebrow: BiText; heroTitle: BiText; heroSub: BiText; brand: BiText; school: BiText;
  accent: AccentKey;
  showStructure: boolean; showNews: boolean;
}
