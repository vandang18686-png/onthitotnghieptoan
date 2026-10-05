import { Question, ExamFolder, SchoolClass } from '../types/exam';

/**
 * Returns formatted question count string according to Ministry of Education structure:
 * [Part 1] - [Part 2] - [Part 3] - [Part 4 (Essay)]
 * e.g., "12-4-6-0"
 */
export function formatQuestionCounts(questions: Question[] = []): string {
  const p1 = questions.filter((q) => q.section === 1).length;
  const p2 = questions.filter((q) => q.section === 2).length;
  const p3 = questions.filter((q) => q.section === 3).length;
  const p4 = 0; // Luôn là 0 đối với đề trắc nghiệm hoàn toàn
  return `${p1}-${p2}-${p3}-${p4}`;
}

/**
 * Chuẩn hóa tiêu đề tiếng Việt: viết hoa chữ cái đầu và các danh từ riêng, từ viết tắt,
 * các từ thông thường còn lại viết chữ thường đúng chuẩn ngữ pháp và chính tả tiếng Việt.
 * Ví dụ: "Đề Kiểm Tra Định Kỳ Môn Toán 12" -> "Đề kiểm tra định kỳ môn Toán 12"
 */
export function formatVietnameseTitle(title: string): string {
  if (!title) return '';

  const PROPER_WORDS: Record<string, string> = {
    'thpt': 'THPT',
    'gd&đt': 'GD&ĐT',
    'bgd': 'BGD',
    'sbd': 'SBD',
    'toán': 'Toán',
    'văn': 'Văn',
    'ngữ văn': 'Ngữ văn',
    'anh': 'Anh',
    'tiếng anh': 'Tiếng Anh',
    'vật lí': 'Vật lí',
    'vật lý': 'Vật lý',
    'hóa': 'Hóa',
    'hóa học': 'Hóa học',
    'sinh': 'Sinh',
    'sinh học': 'Sinh học',
    'lịch sử': 'Lịch sử',
    'địa lí': 'Địa lí',
    'địa lý': 'Địa lý',
    'tin học': 'Tin học',
    'gdcd': 'GDCD',
    'trần hưng đạo': 'Trần Hưng Đạo',
    'quốc học': 'Quốc Học',
    'huế': 'Huế',
    'hà nội': 'Hà Nội',
    'ox': 'Ox',
    'oy': 'Oy',
    'oz': 'Oz',
    'oxyz': 'Oxyz',
  };

  const segments = title.split(/(\s*[-:–—]\s*)/);

  return segments
    .map((seg) => {
      if (/^\s*[-:–—]\s*$/.test(seg)) return seg;

      const words = seg.trim().split(/\s+/);
      if (words.length === 0 || !words[0]) return seg;

      const formattedWords = words.map((w, wIdx) => {
        const lower = w.toLowerCase();

        if (PROPER_WORDS[lower]) {
          return PROPER_WORDS[lower];
        }

        if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(w)) {
          return w.toUpperCase();
        }

        if (/^\d+[A-Z0-9]*$/i.test(w)) {
          return w;
        }

        if (wIdx === 0) {
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }

        return w.toLowerCase();
      });

      return formattedWords.join(' ');
    })
    .join('');
}

export const INITIAL_FOLDERS: ExamFolder[] = [
  { id: 'f-1', name: 'Đề khảo sát & thi thử Trường THPT Trần Hưng Đạo', color: 'bg-blue-500', createdAt: '2026-07-01' },
  { id: 'f-2', name: 'Chuyên đề hình học Oxyz & vector', color: 'bg-purple-500', createdAt: '2026-07-05' },
  { id: 'f-3', name: 'Giải tích: Hàm số & tích phân', color: 'bg-emerald-500', createdAt: '2026-07-10' },
  { id: 'f-4', name: 'Đề kiểm tra định kỳ 45 phút', color: 'bg-amber-500', createdAt: '2026-07-12' },
];

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'class-12a1',
    name: '12A1',
    grade: 12,
    academicYear: '2026-2027',
    homeroomTeacher: 'ThS. Lê Hoàng Nam',
    description: 'Lớp chuyên Toán - Khoa học Tự nhiên',
    createdAt: '2026-08-01',
  },
  {
    id: 'class-12a2',
    name: '12A2',
    grade: 12,
    academicYear: '2026-2027',
    homeroomTeacher: 'Cô Trần Thị Thu Hằng',
    description: 'Lớp chọn Tự nhiên - Toán Lí Hóa',
    createdAt: '2026-08-01',
  },
  {
    id: 'class-12a3',
    name: '12A3',
    grade: 12,
    academicYear: '2026-2027',
    homeroomTeacher: 'Thầy Nguyễn Văn Bình',
    description: 'Khối Khoa học Tự nhiên',
    createdAt: '2026-08-01',
  },
  {
    id: 'class-12d1',
    name: '12D1',
    grade: 12,
    academicYear: '2026-2027',
    homeroomTeacher: 'Cô Hoàng Minh Tâm',
    description: 'Khối Khoa học Xã hội & Ngoại ngữ',
    createdAt: '2026-08-01',
  },
];
