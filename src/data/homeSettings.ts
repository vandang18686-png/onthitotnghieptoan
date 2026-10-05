import { HomeSettings, AccentKey, BiText } from '../types/exam';
import type { Lang } from '../i18n/LanguageContext';
import { CURRENT_SCHOOL_YEAR } from './mockExams';

export const ACCENTS: Record<AccentKey, { brand: string; soft: string; name: BiText }> = {
  teal: { brand: '#0b6e69', soft: '#e3f2f0', name: { vi: 'Xanh ngọc', en: 'Teal' } },
  blue: { brand: '#1d4ed8', soft: '#e0e9ff', name: { vi: 'Xanh dương', en: 'Blue' } },
  emerald: { brand: '#047857', soft: '#d9f5e8', name: { vi: 'Xanh lá', en: 'Green' } },
  violet: { brand: '#6d28d9', soft: '#ede5ff', name: { vi: 'Tím', en: 'Violet' } },
  rose: { brand: '#be123c', soft: '#fde3ea', name: { vi: 'Hồng đậm', en: 'Rose' } },
};

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  eyebrow: { vi: `Năm học ${CURRENT_SCHOOL_YEAR}`, en: `School year ${CURRENT_SCHOOL_YEAR}` },
  heroTitle: { vi: 'Luyện đề đúng cấu trúc, biết ngay mình đang ở đâu', en: 'Practice in the real exam format and see where you stand' },
  heroSub: {
    vi: 'Luyện đề theo định dạng mới của Bộ GD&ĐT: chấm điểm tức thì, xem lời giải chi tiết, lưu bài tự động.',
    en: 'Practice papers in the new Ministry of Education format: instant scoring, step-by-step solutions, automatic progress saving.',
  },
  brand: { vi: 'Ôn thi tốt nghiệp THPT', en: 'National Exam Practice' },
  school: { vi: 'Trường THPT Trần Hưng Đạo', en: 'Tran Hung Dao High School' },
  accent: 'teal', showStructure: true, showNews: true,
};

/** Text in the active language; falls back to Vietnamese, then to the given default. */
export const pick = (b: BiText | undefined, lang: Lang, fallback = ''): string => (b && (b[lang] || b.vi)) || fallback;
export const mergeHomeSettings = (s?: Partial<HomeSettings> | null): HomeSettings => ({ ...DEFAULT_HOME_SETTINGS, ...(s || {}) });
