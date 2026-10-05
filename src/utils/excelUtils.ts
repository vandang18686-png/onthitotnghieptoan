import * as XLSX from 'xlsx';
import { UserAccount } from '../types/exam';

export interface ParsedStudentRow {
  studentId: string; // Mã học sinh / SBD
  fullName: string; // Họ và tên
  classGroup: string; // Lớp (e.g. "12A1")
  username: string; // Tên đăng nhập (tự động đề xuất)
  password?: string; // Mật khẩu (mặc định 123456 nếu để trống)
  isValid: boolean;
  error?: string;
}

/**
 * TCVN3 (ABC font e.g. .VnTime, .VnArial) to Unicode mapping
 * Extremely common in Vietnamese school administrative Excel exports
 */
const TCVN3_MAP: Record<string, string> = {
  // Lowercase
  '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
  'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
  'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
  'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
  '«': 'ô', 'è': 'ố', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ', 'é': 'ộ',
  '¬': 'ơ', 'í': 'ớ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ',
  'ó': 'ú', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
  '­': 'ư', 'ø': 'ứ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự',
  'ý': 'ý', 'ú': 'ỳ', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ',
  '®': 'đ',
  // Uppercase
  '¡': 'Ă', '¢': 'Â', '§': 'Đ', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư',
};

// Latin-1 letters that are ordinary Vietnamese Unicode letters (á à â ã é è ê ì í ò ó ô õ ù ú ý) and that
// TCVN3 also uses for other letters. They cannot tell the two encodings apart on their own.
const VN_LATIN1_LETTERS = 'àáâãèéêìíòóôõùúýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝ';
const TCVN3_ONLY_GLYPHS = new Set(Object.keys(TCVN3_MAP).filter((k) => !VN_LATIN1_LETTERS.includes(k)));
// Letters that only exist in real Unicode Vietnamese text (ă ơ ư đ ĩ ũ, the Ạ-ỹ block, combining accents)
const UNICODE_VN_ONLY = /[\u0300-\u036f\u1ea0-\u1ef9\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01a0\u01a1\u01af\u01b0]/;
// TCVN3 puts capital accented glyphs in the middle of words ("NguyÔn"); Unicode never does
const MID_WORD_CAPITAL = /[a-zđ][ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝÐÑÖ×ØÜÞÆÇËÎÏ]/;

/** True only when the text really looks like TCVN3 (old .VnTime / .VnArial fonts), never for normal Unicode. */
export function looksLikeTcvn3(str: string): boolean {
  if (!str || UNICODE_VN_ONLY.test(str)) return false;
  for (const ch of str) if (TCVN3_ONLY_GLYPHS.has(ch)) return true;
  return MID_WORD_CAPITAL.test(str);
}

/**
 * Converts TCVN3 text to Unicode. Text that is already Unicode (the normal case) is returned untouched;
 * converting it blindly turned "Thúy" into "Thỳy", "Võ" into "Vừ" and "Lê" into "Lờ".
 */
export function tcvn3ToUnicode(str: string): string {
  if (!str) return '';
  if (!looksLikeTcvn3(str)) return str;
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    result += TCVN3_MAP[ch] !== undefined ? TCVN3_MAP[ch] : ch;
  }
  return result;
}

/**
 * Normalizes Vietnamese string to pure ASCII alphanumeric for robust header matching
 * Handles Unicode, TCVN3, accents, non-breaking spaces, punctuation
 * e.g., "Họ và tên" -> "hovaten"
 *       "Họ & Tên" -> "hoten"
 *       "Mã học sinh (SBD)" -> "mahocsinhsbd"
 */
export function normalizeKey(str: string): string {
  if (!str) return '';
  const converted = tcvn3ToUnicode(String(str));
  return converted
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Capitalizes Vietnamese words properly (e.g. "nguyễn văn an" -> "Nguyễn Văn An")
 */
export function formatVietnameseName(name: string): string {
  if (!name) return '';
  const converted = tcvn3ToUnicode(String(name).trim());
  return converted
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .normalize('NFC');
}

/**
 * Remove Vietnamese accents to generate clean usernames (e.g., "Nguyễn Văn An" -> "nguyenvanan")
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  const converted = tcvn3ToUnicode(String(str));
  return converted
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Generate a username for student from studentId and fullName
 * e.g., "hs_" + studentId or clean name + studentId
 */
export function generateStudentUsername(studentId: string, fullName: string): string {
  const cleanId = studentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (cleanId) {
    return `hs_${cleanId}`;
  }
  const cleanName = removeVietnameseAccents(fullName);
  return `hs_${cleanName.slice(0, 10)}_${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Downloads a standardized Excel template for teachers to fill in student lists
 */
export function downloadStudentTemplate(className: string = '12A1'): void {
  const templateData = [
    {
      'STT': 1,
      'Mã học sinh (SBD)': '120101',
      'Họ và tên': 'Nguyễn Văn An',
      'Lớp': className,
      'Mật khẩu (để trống sẽ lấy mặc định 123456)': '123456',
    },
    {
      'STT': 2,
      'Mã học sinh (SBD)': '120102',
      'Họ và tên': 'Trần Thị Mai',
      'Lớp': className,
      'Mật khẩu (để trống sẽ lấy mặc định 123456)': '123456',
    },
    {
      'STT': 3,
      'Mã học sinh (SBD)': '120103',
      'Họ và tên': 'Lê Hoàng Nam',
      'Lớp': className,
      'Mật khẩu (để trống sẽ lấy mặc định 123456)': '123456',
    },
    {
      'STT': 4,
      'Mã học sinh (SBD)': '120104',
      'Họ và tên': 'Phạm Thu Hương',
      'Lớp': className,
      'Mật khẩu (để trống sẽ lấy mặc định 123456)': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 }, // STT
    { wch: 20 }, // Mã học sinh
    { wch: 28 }, // Họ và tên
    { wch: 12 }, // Lớp
    { wch: 45 }, // Mật khẩu
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`Danh sách lớp ${className}`));
  XLSX.writeFile(wb, `Mau_danh_sach_hoc_sinh_${className}.xlsx`);
}

/** Excel sheet names: at most 31 characters and none of  \\ / ? * [ ] : */
const safeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Sheet1';
const nfc = (v: string | undefined) => (v || '').normalize('NFC');

/**
 * Export student login accounts of a class to an Excel file
 */
export function exportClassAccountsToExcel(className: string, students: UserAccount[]): void {
  const exportData = students.map((std, idx) => ({
    'STT': idx + 1,
    'Mã học sinh (SBD)': std.studentId || '',
    'Họ và tên': nfc(std.fullName),
    'Lớp': nfc(std.classGroup || className),
    'Tài khoản đăng nhập': nfc(std.username),
    'Mật khẩu': std.password || '123456',
    'Trường': nfc(std.school || 'Trường THPT Trần Hưng Đạo'),
    'Ngày tạo': std.createdAt || new Date().toLocaleDateString('vi-VN'),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 26 },
    { wch: 12 },
    { wch: 22 },
    { wch: 16 },
    { wch: 32 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`Tài khoản ${className}`));
  XLSX.writeFile(wb, `Danh_sach_tai_khoan_Lop_${className}`.replace(/[\\/:*?"<>|[\]]+/g, '_').replace(/\s+/g, '_') + '.xlsx');
}

/**
 * List of common Vietnamese family names used for heuristic column detection
 */
const COMMON_VN_SURNAMES = [
  'nguyen', 'tran', 'le', 'pham', 'hoang', 'huynh', 'phan', 'vu', 'vo',
  'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'ly', 'dao', 'doan', 'vuong',
  'trinh', 'truong', 'dinh', 'lam', 'phung', 'mai', 'luong', 'chu', 'trieu',
  'ta', 'cao', 'ha', 'luu', 'dinh', 'khuu', 'nham', 'luc'
];

/**
 * Helper to check if a string looks like a Vietnamese full name or surname
 */
function looksLikeVietnameseName(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 6) return false;
  const firstWordNorm = normalizeKey(words[0]);
  return COMMON_VN_SURNAMES.includes(firstWordNorm);
}

/**
 * Helper to check if a string looks like a Vietnamese given name (1 single word)
 */
function looksLikeVietnameseGivenName(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const words = trimmed.split(/\s+/);
  if (words.length !== 1) return false;
  const norm = normalizeKey(words[0]);
  return norm.length >= 2 && norm.length <= 10 && !/\d/.test(norm);
}

/**
 * Classifies a normalized header cell key into a semantic column type
 */
function classifyHeaderCell(cellNorm: string): {
  isFullName?: boolean;
  isHoDem?: boolean;
  isTen?: boolean;
  isStudentId?: boolean;
  isClass?: boolean;
  isPassword?: boolean;
  isStt?: boolean;
} {
  if (!cellNorm) return {};

  // 1. Separate "Họ" or "Họ đệm" or "Họ và tên đệm" or "Họ lót"
  // Note: "hovattendem", "hovatenlot", "hodem", "holot", "hovachulot" have "dem" or "lot"
  if (
    cellNorm === 'ho' ||
    cellNorm === 'hodem' ||
    cellNorm === 'hovadem' ||
    cellNorm === 'holot' ||
    cellNorm === 'hovalot' ||
    cellNorm === 'hochulot' ||
    cellNorm === 'hovachulot' ||
    cellNorm === 'hovattendem' ||
    cellNorm === 'hovatenlot' ||
    cellNorm === 'hotenlot' ||
    cellNorm === 'hovachudem' ||
    cellNorm === 'chulot' ||
    cellNorm === 'tenlot' ||
    cellNorm === 'lastname' ||
    cellNorm === 'surname' ||
    cellNorm.includes('hodem') ||
    cellNorm.includes('holot') ||
    cellNorm.includes('tendem') ||
    cellNorm.includes('chulot')
  ) {
    return { isHoDem: true };
  }

  // 2. Separate "Tên" (e.g. "Tên", "Tên học sinh" when next to "Họ", "First name")
  if (
    cellNorm === 'ten' ||
    cellNorm === 'tengoi' ||
    cellNorm === 'tenchinh' ||
    cellNorm === 'firstname' ||
    cellNorm === 'givenname'
  ) {
    return { isTen: true };
  }

  // 3. Full Name (Họ và tên, Họ tên, Tên học sinh, Họ và tên thí sinh, Full Name, etc.)
  if (
    cellNorm === 'hovaten' ||
    cellNorm === 'hoten' ||
    cellNorm === 'tenhocsinh' ||
    cellNorm === 'hovatenthisinh' ||
    cellNorm === 'hotenthisinh' ||
    cellNorm === 'tenthisinh' ||
    cellNorm === 'hovatendaydu' ||
    cellNorm === 'hovatenhocsinh' ||
    cellNorm === 'hotenhocsinh' ||
    cellNorm === 'fullname' ||
    cellNorm === 'studentname' ||
    cellNorm === 'name' ||
    cellNorm === 'hocsinh' ||
    cellNorm === 'thisinh' ||
    cellNorm === 'nguoihoc' ||
    cellNorm === 'hovatennguoihoc' ||
    cellNorm === 'hotennguoihoc' ||
    cellNorm === 'danhsachhocsinh' ||
    cellNorm.includes('hovaten') ||
    cellNorm.includes('hoten') ||
    cellNorm.includes('fullname') ||
    (cellNorm.startsWith('ten') && cellNorm.includes('hocsinh'))
  ) {
    return { isFullName: true };
  }

  // 4. Student ID / SBD
  if (
    cellNorm === 'sbd' ||
    cellNorm === 'sobaodanh' ||
    cellNorm === 'sobaodanhsbd' ||
    cellNorm === 'mahocsinh' ||
    cellNorm === 'mahs' ||
    cellNorm === 'masv' ||
    cellNorm === 'mssv' ||
    cellNorm === 'madinhdanh' ||
    cellNorm === 'madd' ||
    cellNorm === 'id' ||
    cellNorm === 'code' ||
    cellNorm === 'mathe' ||
    cellNorm === 'cccd' ||
    cellNorm === 'cmnd' ||
    cellNorm.includes('sobaodanh') ||
    cellNorm.includes('mahocsinh') ||
    cellNorm.includes('madinhdanh') ||
    (cellNorm.includes('sbd') && !cellNorm.includes('sbdname'))
  ) {
    return { isStudentId: true };
  }

  // 5. STT
  if (
    cellNorm === 'stt' ||
    cellNorm === 'sott' ||
    cellNorm === 'sothutu' ||
    cellNorm === 'no' ||
    cellNorm === 'order'
  ) {
    return { isStt: true };
  }

  // 6. Class
  if (
    cellNorm === 'lop' ||
    cellNorm === 'malop' ||
    cellNorm === 'tenlop' ||
    cellNorm === 'lopgroup' ||
    cellNorm === 'class' ||
    cellNorm === 'khoi' ||
    cellNorm === 'grade' ||
    cellNorm === 'lophoc' ||
    cellNorm.startsWith('lop')
  ) {
    return { isClass: true };
  }

  // 7. Password
  if (
    cellNorm === 'matkhau' ||
    cellNorm === 'password' ||
    cellNorm === 'pass' ||
    cellNorm === 'mk' ||
    cellNorm === 'passcode' ||
    cellNorm.includes('matkhau')
  ) {
    return { isPassword: true };
  }

  return {};
}

/**
 * Checks if a string or row looks like a footer/summary row that should be ignored
 */
function isSummaryOrFooterText(val: string): boolean {
  if (!val) return false;
  const norm = normalizeKey(val);
  const footerKeywords = [
    'tongso',
    'nguoilap',
    'nguoilapbieu',
    'giaovienchunhiem',
    'hieutruong',
    'bangiamhieu',
    'thutruong',
    'danhsachgom',
    'congso',
    'xacnhancua',
    'ngaythangnam',
    'tongcong',
  ];
  return footerKeywords.some((kw) => norm.includes(kw));
}

// ---------------------------------------------------------------------------------------------
// Reading files: encoding and Unicode form
// ---------------------------------------------------------------------------------------------

/** Decodes a text/CSV file: UTF-16 (BOM), UTF-8 (with or without BOM), then Windows-1258/1252 as a fallback. */
export function decodeTextFile(bytes: Uint8Array): string {
  const decode = (label: string, fatal: boolean): string | null => {
    try {
      return new TextDecoder(label, { fatal }).decode(bytes);
    } catch {
      return null;
    }
  };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return decode('utf-16le', false) || '';
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return decode('utf-16be', false) || '';
  const text = decode('utf-8', true) ?? decode('windows-1258', false) ?? decode('windows-1252', false) ?? '';
  return text.replace(/^\uFEFF/, '');
}

/** xlsx files start with "PK" (zip) and old xls files with the OLE signature; anything else is plain text such as CSV. */
const isBinaryWorkbook = (b: Uint8Array) =>
  (b.length > 3 && b[0] === 0x50 && b[1] === 0x4b) || (b.length > 3 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0);

/** Vietnamese typed with separate accent marks (NFD) looks broken in Excel and defeats searching: always use NFC. */
const nfcValue = (v: any) => (typeof v === 'string' ? v.normalize('NFC') : v);

const readSheet = (ws: XLSX.WorkSheet, opts: XLSX.Sheet2JSONOpts): any[] =>
  XLSX.utils.sheet_to_json(ws, opts).map((row: any) =>
    Array.isArray(row)
      ? row.map(nfcValue)
      : Object.fromEntries(Object.entries(row).map(([k, v]) => [k.normalize('NFC'), nfcValue(v)]))
  );

/**
 * Parse uploaded Excel or CSV file with ultra-resilient header detection,
 * multi-sheet scanning, merged header support, and TCVN3 decoding
 */
export async function parseStudentExcelFile(
  file: File,
  defaultClassName: string = '12A1'
): Promise<ParsedStudentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = isBinaryWorkbook(data)
          ? XLSX.read(data, { type: 'array' })
          : XLSX.read(decodeTextFile(data), { type: 'string' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File Excel không có dữ liệu (trống).');
        }

        // =========================================================================
        // STEP 1: Scan all sheets to find the best sheet with student records
        // =========================================================================
        let bestSheet2D: any[][] | null = null;
        let maxStudentScore = -1;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const sheet2D: any[][] = readSheet(worksheet, { header: 1, defval: '' });
          if (!sheet2D || sheet2D.length === 0) continue;

          // Quick heuristic score for this sheet
          let score = sheet2D.length;
          const sNameNorm = normalizeKey(sheetName);
          if (sNameNorm.includes('danhsach') || sNameNorm.includes('hocsinh') || sNameNorm.includes('lop') || sNameNorm.includes('student')) {
            score += 500;
          }

          // Check if any cells in first 15 rows have "hovaten" or "hoten"
          let hasNameHeader = false;
          for (let r = 0; r < Math.min(20, sheet2D.length); r++) {
            const row = sheet2D[r];
            if (!Array.isArray(row)) continue;
            for (const cell of row) {
              const cNorm = normalizeKey(String(cell));
              if (cNorm === 'hovaten' || cNorm === 'hoten' || cNorm.includes('hovaten') || cNorm.includes('hoten')) {
                hasNameHeader = true;
                break;
              }
            }
            if (hasNameHeader) break;
          }

          if (hasNameHeader) score += 1000;

          if (score > maxStudentScore) {
            maxStudentScore = score;
            bestSheet2D = sheet2D;
          }
        }

        if (!bestSheet2D || bestSheet2D.length === 0) {
          throw new Error('Không tìm thấy dòng dữ liệu nào trong file Excel.');
        }

        const sheet2D = bestSheet2D;

        // =========================================================================
        // STEP 2: Find the header row with deep scoring (handles merged 2-row headers)
        // =========================================================================
        let bestHeaderRowIndex = -1;
        let bestHeaderScore = -1;
        let colFullName = -1;
        let colHoDem = -1;
        let colTen = -1;
        let colStudentId = -1;
        let colClass = -1;
        let colPassword = -1;
        let colStt = -1;

        const maxScanRows = Math.min(50, sheet2D.length);

        for (let r = 0; r < maxScanRows; r++) {
          const row = sheet2D[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          // Row r+1 for two-tier merged headers (vnEdu, SMAS)
          const nextRow = r + 1 < sheet2D.length && Array.isArray(sheet2D[r + 1]) ? sheet2D[r + 1] : null;

          let curFullName = -1;
          let curHoDem = -1;
          let curTen = -1;
          let curStudentId = -1;
          let curClass = -1;
          let curPassword = -1;
          let curStt = -1;
          let rowScore = 0;

          const maxCols = Math.max(row.length, nextRow ? nextRow.length : 0);

          for (let c = 0; c < maxCols; c++) {
            const cellVal = row[c] !== undefined ? String(row[c]) : '';
            const nextCellVal = nextRow && nextRow[c] !== undefined ? String(nextRow[c]) : '';

            const cellNorm = normalizeKey(cellVal);
            const nextCellNorm = normalizeKey(nextCellVal);

            // Classify primary cell
            const primary = classifyHeaderCell(cellNorm);
            // Classify sub-header cell
            const secondary = classifyHeaderCell(nextCellNorm);

            // Check Full Name
            if (primary.isFullName && curFullName === -1) {
              curFullName = c;
              rowScore += 100;
            }

            // Check Ho / Ho Dem
            if (primary.isHoDem && curHoDem === -1) {
              curHoDem = c;
              rowScore += 60;
            } else if (secondary.isHoDem && curHoDem === -1) {
              curHoDem = c;
              rowScore += 60;
            }

            // Check Ten
            if (primary.isTen && curTen === -1) {
              curTen = c;
              rowScore += 60;
            } else if (secondary.isTen && curTen === -1) {
              curTen = c;
              rowScore += 60;
            }

            // Check Student ID / SBD
            if (primary.isStudentId && curStudentId === -1) {
              curStudentId = c;
              rowScore += 30;
            } else if (secondary.isStudentId && curStudentId === -1) {
              curStudentId = c;
              rowScore += 30;
            }

            // Check Class
            if (primary.isClass && curClass === -1) {
              curClass = c;
              rowScore += 20;
            } else if (secondary.isClass && curClass === -1) {
              curClass = c;
              rowScore += 20;
            }

            // Check STT
            if (primary.isStt && curStt === -1) {
              curStt = c;
              rowScore += 15;
            }

            // Check Password
            if (primary.isPassword && curPassword === -1) {
              curPassword = c;
              rowScore += 10;
            }
          }

          // In case a two-tier header has "Họ và tên" in row r (spanning col c & c+1)
          // and row r+1 has "Họ đệm" in col c and "Tên" in col c+1:
          if (curHoDem !== -1 && curTen !== -1) {
            rowScore += 50; // Bonus for having both Ho and Ten columns
          }

          // A valid header row MUST have either Full Name OR (HoDem + Ten)
          const hasName = curFullName !== -1 || (curHoDem !== -1 && curTen !== -1);
          if (hasName && rowScore > bestHeaderScore) {
            bestHeaderScore = rowScore;
            // If nextRow had the actual HoDem/Ten subheaders, start data rows after nextRow
            const usedNextRow = (nextRow && (curHoDem !== -1 || curTen !== -1)) &&
              (curHoDem !== -1 && classifyHeaderCell(normalizeKey(String(nextRow[curHoDem]))).isHoDem);
            bestHeaderRowIndex = usedNextRow ? r + 1 : r;
            colFullName = curFullName;
            colHoDem = curHoDem;
            colTen = curTen;
            colStudentId = curStudentId;
            colClass = curClass;
            colPassword = curPassword;
            colStt = curStt;
          }
        }

        // =========================================================================
        // STEP 3: Fallback content-based heuristic if no header row was detected
        // =========================================================================
        if (bestHeaderRowIndex === -1) {
          // Scan columns for Vietnamese names directly in the data
          const colNameScores: Record<number, number> = {};
          const colGivenNameScores: Record<number, number> = {};

          for (let r = 0; r < Math.min(25, sheet2D.length); r++) {
            const row = sheet2D[r];
            if (!Array.isArray(row)) continue;
            row.forEach((cell, c) => {
              const strVal = String(cell || '').trim();
              if (looksLikeVietnameseName(strVal)) {
                colNameScores[c] = (colNameScores[c] || 0) + 1;
              } else if (looksLikeVietnameseGivenName(strVal)) {
                colGivenNameScores[c] = (colGivenNameScores[c] || 0) + 1;
              }
            });
          }

          // Find column with most full names
          let bestNameCol = -1;
          let maxNames = 0;
          Object.entries(colNameScores).forEach(([colStr, cnt]) => {
            if (cnt > maxNames) {
              maxNames = cnt;
              bestNameCol = Number(colStr);
            }
          });

          if (bestNameCol !== -1 && maxNames >= 1) {
            colFullName = bestNameCol;
            bestHeaderRowIndex = 0; // Assume data starts from row 0 or 1
            // Check if row 0 was a title or header
            const r0Val = normalizeKey(String(sheet2D[0]?.[bestNameCol] || ''));
            if (r0Val.includes('ten') || r0Val.includes('ho') || r0Val.includes('danhsach')) {
              bestHeaderRowIndex = 0;
            } else {
              bestHeaderRowIndex = -1; // Data starts at row 0
            }
          }
        }

        // =========================================================================
        // STEP 4: Parse Student Data Rows
        // =========================================================================
        const results: ParsedStudentRow[] = [];
        const startRow = Math.max(0, bestHeaderRowIndex + 1);
        let studentCounter = 0;

        for (let r = startRow; r < sheet2D.length; r++) {
          const row = sheet2D[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          // Extract Full Name
          let fullName = '';
          if (colFullName !== -1 && row[colFullName] !== undefined) {
            fullName = formatVietnameseName(String(row[colFullName]));
            // If vnEdu exported with two columns where colFullName had middle name and next col had given name:
            if (colTen !== -1 && row[colTen] !== undefined) {
              const ten = formatVietnameseName(String(row[colTen]));
              if (ten && !fullName.toLowerCase().endsWith(ten.toLowerCase())) {
                fullName = `${fullName} ${ten}`.trim();
              }
            }
          } else if (colHoDem !== -1 && colTen !== -1) {
            const ho = formatVietnameseName(String(row[colHoDem] || ''));
            const ten = formatVietnameseName(String(row[colTen] || ''));
            if (ho || ten) {
              fullName = `${ho} ${ten}`.trim();
            }
          } else {
            // Heuristic search in this row for any cell that looks like a name
            for (let c = 0; c < row.length; c++) {
              const cellVal = String(row[c] || '').trim();
              if (looksLikeVietnameseName(cellVal)) {
                fullName = formatVietnameseName(cellVal);
                break;
              }
            }
          }

          // Extract Student ID / SBD
          let studentId = '';
          if (colStudentId !== -1 && row[colStudentId] !== undefined) {
            studentId = String(row[colStudentId]).trim();
          }

          // Extract STT
          let sttVal = '';
          if (colStt !== -1 && row[colStt] !== undefined) {
            sttVal = String(row[colStt]).trim();
          }

          // Extract Class
          let classGroup = defaultClassName;
          if (colClass !== -1 && row[colClass] !== undefined && String(row[colClass]).trim()) {
            classGroup = String(row[colClass]).trim();
          }

          // Extract Password
          let password = '123456';
          if (colPassword !== -1 && row[colPassword] !== undefined && String(row[colPassword]).trim()) {
            password = String(row[colPassword]).trim();
          }

          // Skip empty or summary rows
          if (!fullName && !studentId) continue;
          if (isSummaryOrFooterText(fullName) || isSummaryOrFooterText(studentId)) continue;
          if (fullName.toLowerCase().includes('tổng số') || fullName.toLowerCase().includes('người lập')) continue;

          // If row is a repeated header row (e.g. page breaks in Excel)
          const normName = normalizeKey(fullName);
          if (normName === 'hovaten' || normName === 'hoten' || normName === 'tenhocsinh') continue;

          studentCounter++;

          // Auto-generate studentId if missing so that teacher never gets blocked!
          if (!studentId) {
            const cleanClass = classGroup.replace(/[^a-zA-Z0-9]/g, '');
            const numPart = sttVal && /^\d+$/.test(sttVal) ? sttVal.padStart(2, '0') : String(studentCounter).padStart(2, '0');
            studentId = `${cleanClass}_${numPart}`;
          }

          let isValid = true;
          let error = '';

          if (!fullName) {
            isValid = false;
            error = 'Thiếu họ và tên học sinh';
          }

          const username = generateStudentUsername(studentId, fullName || `std_${studentCounter}`);

          results.push({
            studentId,
            fullName,
            classGroup,
            username,
            password,
            isValid,
            error,
          });
        }

        // If results parsed, resolve!
        if (results.length > 0) {
          resolve(results);
          return;
        }

        // =========================================================================
        // STEP 5: Fallback sheet_to_json if 2D array did not find any rows
        // =========================================================================
        const rawJson: any[] = readSheet(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
        let jsonCounter = 0;

        rawJson.forEach((row: any, index: number) => {
          const keys = Object.keys(row);

          let fullName = '';
          let ho = '';
          let ten = '';
          let studentId = '';
          let classGroup = defaultClassName;
          let password = '123456';
          let sttVal = '';

          keys.forEach((k) => {
            const kNorm = normalizeKey(k);
            const val = String(row[k] || '').trim();
            if (!val) return;

            const classification = classifyHeaderCell(kNorm);

            if (classification.isFullName && !fullName) {
              fullName = formatVietnameseName(val);
            } else if (classification.isHoDem && !ho) {
              ho = formatVietnameseName(val);
            } else if (classification.isTen && !ten) {
              ten = formatVietnameseName(val);
            } else if (classification.isStudentId && !studentId) {
              studentId = val;
            } else if (classification.isClass) {
              classGroup = val;
            } else if (classification.isPassword) {
              password = val;
            } else if (classification.isStt) {
              sttVal = val;
            }
          });

          if (!fullName && (ho || ten)) {
            fullName = `${ho} ${ten}`.trim();
          }

          if (!fullName && !studentId) return;
          if (isSummaryOrFooterText(fullName) || isSummaryOrFooterText(studentId)) return;

          jsonCounter++;
          if (!studentId) {
            const cleanClass = classGroup.replace(/[^a-zA-Z0-9]/g, '');
            const numPart = sttVal && /^\d+$/.test(sttVal) ? sttVal.padStart(2, '0') : String(jsonCounter).padStart(2, '0');
            studentId = `${cleanClass}_${numPart}`;
          }

          let isValid = true;
          let error = '';

          if (!fullName) {
            isValid = false;
            error = 'Thiếu họ và tên học sinh';
          }

          const username = generateStudentUsername(studentId, fullName || `std_${jsonCounter}`);

          results.push({
            studentId,
            fullName,
            classGroup,
            username,
            password,
            isValid,
            error,
          });
        });

        resolve(results);
      } catch (err: any) {
        console.error('Error parsing student Excel:', err);
        reject(new Error(err?.message || 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file trên thiết bị.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
