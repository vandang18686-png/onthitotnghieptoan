import * as XLSX from 'xlsx';
import { ExamResult, SchoolClass, UserAccount } from '../types/exam';
import { tr } from '../i18n/LanguageContext';

/** "Lớp 12A1", "12 a1" and "12A1" all become "12a1". */
export const normClass = (c?: string) => (c || '').toLowerCase().replace(/^lớp\s*/, '').replace(/\s+/g, '').trim();

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

/** Vietnamese roll-call order: by given name (last word), then by the rest of the name. */
const nameKey = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return `${parts[parts.length - 1] || ''} ${parts.slice(0, -1).join(' ')}`;
};
export const compareNames = (a: string, b: string) => collator.compare(nameKey(a), nameKey(b));

export interface ClassSummary {
  key: string;
  name: string;
  totalStudents: number;
  submittedStudents: number;
  attempts: number;
  avg: number;
  max: number;
  min: number;
  pass5: number; // % of attempts scoring 5.0 or more
  good8: number; // % of attempts scoring 8.0 or more
}

const stats = (rs: ExamResult[]) => {
  const n = rs.length;
  if (!n) return { avg: 0, max: 0, min: 0, pass5: 0, good8: 0 };
  const scores = rs.map((r) => r.totalScore);
  return {
    avg: scores.reduce((a, b) => a + b, 0) / n,
    max: Math.max(...scores),
    min: Math.min(...scores),
    pass5: (scores.filter((s) => s >= 5).length / n) * 100,
    good8: (scores.filter((s) => s >= 8).length / n) * 100,
  };
};
export const overallStats = stats;

/** One row per class, built from the class list, the student accounts and the submissions. */
export function summarizeByClass(results: ExamResult[], students: UserAccount[], classes: SchoolClass[]): ClassSummary[] {
  const names = new Map<string, string>();
  const remember = (raw?: string) => {
    const key = normClass(raw);
    if (!names.has(key)) names.set(key, (raw || '').replace(/^lớp\s*/i, '').trim());
  };
  classes.forEach((c) => remember(c.name));
  students.forEach((s) => remember(s.classGroup));
  results.forEach((r) => remember(r.studentClass));

  return Array.from(names.entries())
    .map(([key, name]) => {
      const rs = results.filter((r) => normClass(r.studentClass) === key);
      return {
        key,
        name: name || tr('Chưa có lớp'),
        totalStudents: students.filter((s) => normClass(s.classGroup) === key).length,
        submittedStudents: new Set(rs.map((r) => r.studentId)).size,
        attempts: rs.length,
        ...stats(rs),
      };
    })
    .filter((c) => c.totalStudents > 0 || c.attempts > 0)
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Students of the given class (or every class) with no submission among `results`. */
export function missingStudents(results: ExamResult[], students: UserAccount[], classKey: string): UserAccount[] {
  const done = new Set(results.map((r) => r.studentId));
  return students
    .filter((s) => (classKey === 'all' || normClass(s.classGroup) === classKey) && !done.has(s.id))
    .sort((a, b) => collator.compare(a.classGroup || '', b.classGroup || '') || compareNames(a.fullName, b.fullName));
}

export const sortResults = (rs: ExamResult[]) =>
  [...rs].sort((a, b) => collator.compare(a.studentClass || '', b.studentClass || '') || compareNames(a.studentName, b.studentName));

export const formatDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const sheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet';
const ascii = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

const detailRows = (rs: ExamResult[]) =>
  sortResults(rs).map((r, i) => ({
    [tr('STT')]: i + 1,
    [tr('Họ và tên')]: r.studentName,
    SBD: r.sbd,
    [tr('Lớp')]: r.studentClass,
    [tr('Đề thi')]: r.examTitle,
    [tr('Phần I (TN)')]: r.section1Score,
    [tr('Phần II (Đ/S)')]: r.section2Score,
    [tr('Phần III (TLN)')]: r.section3Score,
    [tr('Tổng Điểm')]: r.totalScore,
    [tr('Số câu đúng (Phần I)')]: r.section1CorrectCount,
    [tr('Số ý đúng (Phần II)')]: r.section2CorrectItemsCount,
    [tr('Số câu đúng (Phần III)')]: r.section3CorrectCount,
    [tr('Thời gian làm (phút:giây)')]: formatDuration(r.timeSpentSeconds),
    [tr('Thời gian nộp')]: r.submittedAt,
  }));

const addSheet = (wb: XLSX.WorkBook, name: string, rows: Record<string, unknown>[], widths: number[]) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName(name));
};

export interface ExportOptions {
  results: ExamResult[];
  students: UserAccount[];
  classes: SchoolClass[];
  /** Used in the file name, e.g. the class name. */
  label: string;
  /** Add a "not submitted" sheet (only meaningful when the results belong to a single paper). */
  includeMissing: boolean;
  missingClassKey: string;
}

/** Workbook: summary by class, all submissions, one sheet per class, optional "not submitted" list. */
export function exportResultsToExcel(o: ExportOptions): void {
  const wb = XLSX.utils.book_new();
  const summary = summarizeByClass(o.results, o.students, o.classes);

  addSheet(
    wb,
    tr('Tổng hợp theo lớp'),
    summary.map((c) => ({
      [tr('Lớp')]: c.name,
      [tr('Sĩ số')]: c.totalStudents,
      [tr('Đã nộp')]: c.submittedStudents,
      [tr('Chưa nộp')]: Math.max(0, c.totalStudents - c.submittedStudents),
      [tr('Lượt nộp')]: c.attempts,
      [tr('Điểm TB')]: Number(c.avg.toFixed(2)),
      [tr('Cao nhất')]: c.max,
      [tr('Thấp nhất')]: c.min,
      [tr('Từ 5 điểm (%)')]: Number(c.pass5.toFixed(1)),
      [tr('Từ 8 điểm (%)')]: Number(c.good8.toFixed(1)),
    })),
    [14, 10, 10, 10, 10, 10, 10, 10, 14, 14]
  );

  const widths = [6, 26, 14, 10, 40, 12, 14, 14, 11, 16, 16, 18, 20, 20];
  addSheet(wb, tr('Tất cả bài làm'), detailRows(o.results), widths);

  const withResults = summary.filter((c) => c.attempts > 0);
  if (withResults.length > 1) {
    withResults.forEach((c) =>
      addSheet(wb, `${tr('Lớp')} ${c.name}`, detailRows(o.results.filter((r) => normClass(r.studentClass) === c.key)), widths)
    );
  }

  if (o.includeMissing) {
    const miss = missingStudents(o.results, o.students, o.missingClassKey);
    addSheet(
      wb,
      tr('Chưa nộp bài'),
      miss.map((s, i) => ({
        [tr('STT')]: i + 1,
        [tr('Họ và tên')]: s.fullName,
        SBD: s.studentId || '',
        [tr('Lớp')]: s.classGroup || '',
      })),
      [6, 28, 14, 10]
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Ket_qua_lam_bai_${ascii(o.label) || 'Tat_ca'}_${date}.xlsx`);
}
