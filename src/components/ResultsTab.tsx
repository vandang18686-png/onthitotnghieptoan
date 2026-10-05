import React, { useMemo, useState } from 'react';
import { BarChart3, Download, Search, Trash2, ChevronRight, Copy, Check } from 'lucide-react';
import { Exam, ExamResult, SchoolClass, UserAccount } from '../types/exam';
import { StudentResultDetail } from './StudentResultDetail';
import { displayName } from '../utils/gradeResult';
import { tr, trf } from '../i18n/LanguageContext';
import {
  normClass, summarizeByClass, missingStudents, overallStats, sortResults, exportResultsToExcel,
} from '../utils/resultsExport';

interface ResultsTabProps {
  results: ExamResult[];
  exams: Exam[];
  students: UserAccount[];
  classes: SchoolClass[];
  onDeleteResult: (r: ExamResult) => void;
  onClearAll: () => void;
}

const field = 'px-3 py-2 text-sm rounded-lg border border-line bg-white focus:border-brand outline-none';
const badge = (s: number) =>
  s >= 8 ? 'bg-emerald-100 text-emerald-800' : s >= 5 ? 'bg-brand-soft text-brand' : 'bg-rose-100 text-rose-700';

export const ResultsTab: React.FC<ResultsTabProps> = ({ results: rawResults, exams: examList, students, classes, onDeleteResult, onClearAll }) => {
  // A renamed student shows the new name on every earlier submission
  const results = useMemo(() => {
    const names = new Map(students.map((a) => [a.id, a.fullName]));
    return rawResults.map((r) => (names.get(r.studentId) && names.get(r.studentId) !== r.studentName ? { ...r, studentName: names.get(r.studentId) as string } : r));
  }, [rawResults, students]);
  const empty = results.length === 0;
  const [view, setView] = useState<'class' | 'detail'>('class');
  const [examId, setExamId] = useState('all');
  const [classKey, setClassKey] = useState('all');
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const [openResult, setOpenResult] = useState<ExamResult | null>(null);

  const exams = useMemo(() => {
    const m = new Map<string, string>();
    results.forEach((r) => m.set(r.examId, r.examTitle));
    return Array.from(m.entries());
  }, [results]);

  // Results of the chosen paper; every class-level number is computed from this set
  const byExam = useMemo(() => (examId === 'all' ? results : results.filter((r) => r.examId === examId)), [results, examId]);
  const summary = useMemo(() => summarizeByClass(byExam, students, classes), [byExam, students, classes]);

  const detail = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sortResults(
      byExam.filter(
        (r) =>
          (classKey === 'all' || normClass(r.studentClass) === classKey) &&
          (!term || `${r.studentName} ${r.sbd} ${r.studentClass} ${r.examTitle}`.toLowerCase().includes(term))
      )
    );
  }, [byExam, classKey, q]);

  const scope = view === 'detail' ? detail : byExam;
  const kpi = overallStats(scope);
  const distinct = new Set(scope.map((r) => r.studentId)).size;
  const className = summary.find((c) => c.key === classKey)?.name;
  const missing = examId !== 'all' ? missingStudents(byExam, students, classKey) : [];

  const doExport = () =>
    exportResultsToExcel({
      results: classKey !== 'all' ? byExam.filter((r) => normClass(r.studentClass) === classKey) : byExam,
      students,
      classes,
      label: className || (examId !== 'all' ? tr('Theo đề') : tr('Tất cả')),
      includeMissing: examId !== 'all',
      missingClassKey: classKey,
    });

  const copyMissing = async () => {
    try {
      await navigator.clipboard.writeText(missing.map((s) => `${s.fullName}${s.classGroup ? ` (${s.classGroup})` : ''}`).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-ink">{tr('Kết quả làm bài')} ({results.length})</h2>
        <p className="text-sm text-ink-2">{tr('Bảng điểm tổng hợp từ các bài làm thí sinh nộp trực tuyến')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={doExport} disabled={empty}
          title={empty ? tr('Chưa có bài làm để xuất') : undefined}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand/90 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          <Download className="w-4 h-4" />
          {className ? trf('Xuất Excel lớp {c}', { c: className }) : tr('Xuất Excel')}
        </button>
        {!empty && (
          <button type="button" onClick={onClearAll} title={tr('Xóa toàn bộ lịch sử nộp bài')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer">
            <Trash2 className="w-4 h-4" />
            {tr('Xóa toàn bộ lịch sử')}
          </button>
        )}
      </div>
    </div>
  );

  const tiles: [string, string | number][] = [
    [tr('Lượt nộp'), scope.length], [tr('Học sinh đã nộp'), distinct],
    [tr('Điểm TB'), kpi.avg.toFixed(2)], [tr('Cao nhất'), kpi.max.toFixed(2)], [tr('Từ 5 điểm (%)'), `${kpi.pass5.toFixed(0)}%`],
  ];

  return (
    <div className="space-y-5">
      {header}

      {empty && (
        <div className="bg-brand-soft rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-brand flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-ink">{tr('Chưa có lịch sử làm bài nào')}</h3>
            <p className="text-sm text-ink-2 mt-0.5">
              {tr('Khi học sinh đăng nhập và nộp bài thi trắc nghiệm trực tuyến, danh sách kết quả, phổ điểm chi tiết và thời gian làm bài sẽ được lưu lại tại đây.')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-line p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div role="tablist" className="inline-flex rounded-lg border border-line p-0.5 bg-paper text-sm font-semibold">
          {([['class', tr('Theo lớp')], ['detail', tr('Chi tiết bài làm')]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`px-3.5 py-1.5 rounded-md cursor-pointer ${view === id ? 'bg-white text-brand shadow-sm' : 'text-ink-2 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        <select value={examId} onChange={(e) => setExamId(e.target.value)} className={`${field} max-w-[260px]`} aria-label={tr('Đề thi')}>
          <option value="all">{tr('Tất cả đề thi')}</option>
          {exams.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>

        {view === 'detail' && (
          <>
            <select value={classKey} onChange={(e) => setClassKey(e.target.value)} className={field} aria-label={tr('Lớp')}>
              <option value="all">{tr('Tất cả các lớp')}</option>
              {summary.map((c) => <option key={c.key} value={c.key}>{tr('Lớp')} {c.name}</option>)}
            </select>
            <label className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Tìm học sinh, SBD, đề...')} className={`${field} w-full pl-9`} />
            </label>
          </>
        )}
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tiles.map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl border border-line px-4 py-3">
            <dd className="text-2xl font-extrabold text-ink leading-none">{v}</dd>
            <dt className="text-xs text-ink-2 mt-1.5">{l}</dt>
          </div>
        ))}
      </dl>

      {view === 'class' ? (
        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-ink-2 text-xs font-semibold border-b border-line">
                <tr>
                  <th className="p-3.5">{tr('Lớp')}</th>
                  <th className="p-3.5 text-center">{tr('Sĩ số')}</th>
                  <th className="p-3.5 min-w-[160px]">{tr('Đã nộp')}</th>
                  <th className="p-3.5 text-center">{tr('Chưa nộp')}</th>
                  <th className="p-3.5 text-center">{tr('Lượt nộp')}</th>
                  <th className="p-3.5 text-center">{tr('Điểm TB')}</th>
                  <th className="p-3.5 text-center">{tr('Cao nhất')}</th>
                  <th className="p-3.5 text-center">{tr('Thấp nhất')}</th>
                  <th className="p-3.5 text-center">{tr('Từ 5 điểm (%)')}</th>
                  <th className="p-3.5 text-center">{tr('Từ 8 điểm (%)')}</th>
                  <th className="p-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.length === 0 && (
                  <tr><td colSpan={11} className="p-6 text-center text-ink-2">{tr('Chưa có lớp hoặc học sinh nào.')}</td></tr>
                )}
                {summary.map((c) => {
                  const pct = c.totalStudents ? Math.min(100, (c.submittedStudents / c.totalStudents) * 100) : 0;
                  return (
                    <tr key={c.key} className="hover:bg-paper/60">
                      <td className="p-3.5 font-bold text-ink">{c.name}</td>
                      <td className="p-3.5 text-center">{c.totalStudents}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-8 font-semibold text-ink">{c.submittedStudents}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
                        </div>
                      </td>
                      <td className={`p-3.5 text-center font-semibold ${c.totalStudents - c.submittedStudents > 0 ? 'text-short' : 'text-ink-2'}`}>
                        {Math.max(0, c.totalStudents - c.submittedStudents)}
                      </td>
                      <td className="p-3.5 text-center">{c.attempts}</td>
                      <td className="p-3.5 text-center">{c.attempts ? <span className={`px-2.5 py-1 rounded-full font-bold ${badge(c.avg)}`}>{c.avg.toFixed(2)}</span> : '–'}</td>
                      <td className="p-3.5 text-center">{c.attempts ? c.max.toFixed(2) : '–'}</td>
                      <td className="p-3.5 text-center">{c.attempts ? c.min.toFixed(2) : '–'}</td>
                      <td className="p-3.5 text-center">{c.attempts ? `${c.pass5.toFixed(0)}%` : '–'}</td>
                      <td className="p-3.5 text-center">{c.attempts ? `${c.good8.toFixed(0)}%` : '–'}</td>
                      <td className="p-3.5 text-right">
                        <button type="button" onClick={() => { setClassKey(c.key); setView('detail'); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline cursor-pointer whitespace-nowrap">
                          {tr('Xem chi tiết')}<ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-ink-2 border-t border-line">
            {tr('Điểm TB, cao nhất, thấp nhất tính trên tất cả các lượt nộp. Sĩ số lấy từ danh sách tài khoản học sinh của lớp.')}
          </p>
        </div>
      ) : (
        <>
          {detail.length === 0 ? (
            <div className="bg-white rounded-2xl border border-line p-8 text-center text-sm text-ink-2">
              {empty ? tr('Chưa có bài làm nào.') : tr('Không tìm thấy kết quả phù hợp.')}
              {!empty && <button type="button" onClick={() => { setQ(''); setClassKey('all'); }} className="ml-2 font-semibold text-brand hover:underline cursor-pointer">
                {tr('Xóa bộ lọc tìm kiếm')}
              </button>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper text-ink-2 text-xs font-semibold border-b border-line">
                    <tr>
                      <th className="p-3.5">{tr('Học sinh')}</th>
                      <th className="p-3.5">SBD</th>
                      <th className="p-3.5">{tr('Lớp')}</th>
                      <th className="p-3.5">{tr('Đề thi')}</th>
                      <th className="p-3.5 text-center">{tr('Phần I (TN)')}</th>
                      <th className="p-3.5 text-center">{tr('Phần II (Đ/S)')}</th>
                      <th className="p-3.5 text-center">{tr('Phần III (TLN)')}</th>
                      <th className="p-3.5 text-right">{tr('Tổng Điểm')}</th>
                      <th className="p-3.5 text-right">{tr('Thời gian nộp')}</th>
                      <th className="p-3.5 text-center">{tr('Thao tác')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.map((r) => (
                      <tr key={r.id} className="hover:bg-paper/60">
                        <td className="p-3.5">
                          <button type="button" onClick={() => setOpenResult(r)} title={tr('Xem chi tiết bài làm')}
                            className="font-bold text-ink hover:text-brand hover:underline text-left cursor-pointer">
                            {displayName(r.studentName)}
                          </button>
                        </td>
                        <td className="p-3.5 font-mono text-ink-2">{r.sbd}</td>
                        <td className="p-3.5">{r.studentClass}</td>
                        <td className="p-3.5 max-w-xs truncate" title={r.examTitle}>{r.examTitle}</td>
                        <td className="p-3.5 text-center font-mono">{r.section1Score.toFixed(2)}</td>
                        <td className="p-3.5 text-center font-mono">{r.section2Score.toFixed(2)}</td>
                        <td className="p-3.5 text-center font-mono">{r.section3Score.toFixed(2)}</td>
                        <td className="p-3.5 text-right"><span className={`px-2.5 py-1 rounded-full font-bold font-mono text-xs ${badge(r.totalScore)}`}>{r.totalScore.toFixed(2)}</span></td>
                        <td className="p-3.5 text-right text-ink-2 whitespace-nowrap">{r.submittedAt}</td>
                        <td className="p-3.5 text-center">
                          <button type="button" onClick={() => onDeleteResult(r)} title={tr('Xóa bài làm này')}
                            className="p-1.5 text-ink-2 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {examId !== 'all' && (
            <div className="bg-white rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{tr('Chưa nộp bài')} ({missing.length})</h3>
                {missing.length > 0 && (
                  <button type="button" onClick={copyMissing} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? tr('Đã sao chép') : tr('Sao chép danh sách')}
                  </button>
                )}
              </div>
              {missing.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">{tr('Mọi học sinh trong phạm vi đã chọn đều đã nộp bài.')}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missing.map((s) => (
                    <span key={s.id} className="px-2.5 py-1 rounded-full bg-paper border border-line text-xs text-ink">
                      {s.fullName}{s.classGroup ? <span className="text-ink-2"> · {s.classGroup}</span> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {openResult && (
        <StudentResultDetail result={openResult} exam={examList.find((e) => e.id === openResult.examId)} onClose={() => setOpenResult(null)} />
      )}
    </div>
  );
};
