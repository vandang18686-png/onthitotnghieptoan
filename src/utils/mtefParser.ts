import * as CFB from 'cfb';

/**
 * MTEF (MathType Equation Format) Parser for TypeScript
 * Parses MathType v3 & v5 binary structures from OLE compound objects (.bin)
 * and outputs standard KaTeX-compatible LaTeX equations.
 */

// Record Types in MTEF
const REC_END = 0;
const REC_LINE = 1;
const REC_CHAR = 2;
const REC_TMPL = 3;
const REC_PILE = 4;
const REC_MATRIX = 5;
const REC_EMBELL = 6;
const REC_RULER = 7;
const REC_FONT_STYLE_DEF = 8;
const REC_SIZE = 9;
const REC_FULL = 10;
const REC_SUB = 11;
const REC_SUB2 = 12;
const REC_SYM = 13;
const REC_SUBSYM = 14;
const REC_COLOR = 15;
const REC_COLOR_DEF = 16;
const REC_FONT_DEF = 17;
const REC_EQN_PREFS = 18;
const REC_ENCODING_DEF = 19;
const REC_FUTURE = 100;
const REC_ROOT = 255;

// Template Selectors
const TM_ANGLE = 0;
const TM_PAREN = 1;
const TM_BRACE = 2;
const TM_BRACK = 3;
const TM_BAR = 4;
const TM_DBAR = 5;
const TM_FLOOR = 6;
const TM_CEILING = 7;
const TM_OBRACK = 8;
const TM_INTERVAL = 9;
const TM_ROOT = 10;
const TM_FRACT = 11;
const TM_UBAR = 12;
const TM_OBAR = 13;
const TM_ARROW = 14;
const TM_INTEG = 15;
const TM_SUM = 16;
const TM_PROD = 17;
const TM_COPROD = 18;
const TM_UNION = 19;
const TM_INTER = 20;
const TM_INTOP = 21;
const TM_SUMOP = 22;
const TM_LIM = 23;
const TM_HBRACE = 24;
const TM_HBRACK = 25;
const TM_LDIV = 26;
const TM_SUB = 27;
const TM_SUP = 28;
const TM_SUBSUP = 29;
const TM_DIRAC = 30;
const TM_VEC = 31;
const TM_TILDE = 32;
const TM_HAT = 33;
const TM_ARC = 34;
const TM_JSTATUS = 35;
const TM_STRIKE = 36;
const TM_BOX = 37;

// Embellishment Types
const EMB_1DOT = 2;
const EMB_2DOT = 3;
const EMB_3DOT = 4;
const EMB_1PRIME = 5;
const EMB_2PRIME = 6;
const EMB_TILDE = 8;
const EMB_HAT = 9;
const EMB_OBAR = 17;
const EMB_3PRIME = 18;

// Common MTEF MTCode to LaTeX mappings
const SPECIAL_MTCODES: Record<number, string> = {
  0x00b1: '\\pm ',
  0x00d7: '\\times ',
  0x00f7: '\\div ',
  0x00b0: '^\\circ ',
  0x0394: '\\Delta ',
  0x03a9: '\\Omega ',
  0x03b1: '\\alpha ',
  0x03b2: '\\beta ',
  0x03b3: '\\gamma ',
  0x03b4: '\\delta ',
  0x03b5: '\\epsilon ',
  0x03b8: '\\theta ',
  0x03bb: '\\lambda ',
  0x03bc: '\\mu ',
  0x03c0: '\\pi ',
  0x03c1: '\\rho ',
  0x03c3: '\\sigma ',
  0x03c4: '\\tau ',
  0x03c6: '\\phi ',
  0x03c9: '\\omega ',
  0x2032: "'",
  0x02b9: "'",
  0x2026: '\\dots ',
  0x2115: '\\mathbb{N}',
  0x211a: '\\mathbb{Q}',
  0x211d: '\\mathbb{R}',
  0x2124: '\\mathbb{Z}',
  0x2192: '\\to ',
  0x21d2: '\\Rightarrow ',
  0x21d4: '\\Leftrightarrow ',
  0x2205: '\\emptyset ',
  0x2208: '\\in ',
  0x2209: '\\notin ',
  0x2212: '-',
  0x221a: '\\sqrt',
  0x221e: '\\infty ',
  0x2225: '\\parallel ',
  0x2229: '\\cap ',
  0x222a: '\\cup ',
  0x222b: '\\int ',
  0x2248: '\\approx ',
  0x2260: '\\ne ',
  0x2264: '\\le ',
  0x2265: '\\ge ',
  0x2282: '\\subset ',
  0x22a5: '\\perp ',
  0x22c5: '\\cdot ',
};

interface ASTNode {
  tag: number;
  value?: any;
  children: ASTNode[];
}

class ByteReader {
  private buffer: Uint8Array;
  private pos = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  get length(): number {
    return this.buffer.length;
  }

  get position(): number {
    return this.pos;
  }

  hasMore(): boolean {
    return this.pos < this.buffer.length;
  }

  readUint8(): number {
    if (this.pos >= this.buffer.length) return 0;
    return this.buffer[this.pos++];
  }

  readInt8(): number {
    const u = this.readUint8();
    return u > 127 ? u - 256 : u;
  }

  readUint16(): number {
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    return b1 | (b2 << 8);
  }

  readInt16(): number {
    const u = this.readUint16();
    return u > 32767 ? u - 65536 : u;
  }

  readUint32(): number {
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    const b3 = this.readUint8();
    const b4 = this.readUint8();
    return (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)) >>> 0;
  }

  skip(count: number): void {
    this.pos = Math.min(this.buffer.length, this.pos + count);
  }

  readNullTerminatedString(): string {
    const chars: number[] = [];
    while (this.hasMore()) {
      const b = this.readUint8();
      if (b === 0) break;
      chars.push(b);
    }
    return String.fromCharCode(...chars);
  }

  readNudge(): { x: number; y: number } {
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    let x = b1;
    let y = b2;
    if (b1 === 128 || b2 === 128) {
      x = this.readInt16();
      y = this.readInt16();
    }
    return { x, y };
  }

  readDimensionArrays(size: number): void {
    // Skip dimension records
    let count = 0;
    while (this.hasMore() && count < size) {
      const ch = this.readUint8();
      const hi = (ch & 0xf0) >> 4;
      const lo = ch & 0x0f;
      if (hi === 0x0f) count++;
      if (lo === 0x0f) count++;
    }
  }
}

/**
 * Parses raw MTEF bytes into an AST and translates to LaTeX
 */
export function parseMtefBytesToLatex(mtefBytes: Uint8Array): string | null {
  if (!mtefBytes || mtefBytes.length < 5) return null;

  try {
    const reader = new ByteReader(mtefBytes);

    // MTEF Header
    const mtefVer = reader.readUint8();
    if (mtefVer !== 3 && mtefVer !== 4 && mtefVer !== 5) {
      // Not a supported MTEF version
      return null;
    }

    const platform = reader.readUint8(); // 0: Mac, 1: Windows
    const product = reader.readUint8();  // 0: MathType, 1: EqnEditor
    const version = reader.readUint8();
    const subver = reader.readUint8();

    // App name null-terminated string (only in v5)
    if (mtefVer >= 5) {
      reader.readNullTerminatedString();
      reader.readUint8(); // inline
    }

    const rootNode: ASTNode = { tag: REC_ROOT, children: [] };
    const stack: ASTNode[] = [rootNode];

    while (reader.hasMore()) {
      const record = reader.readUint8();

      if (record >= REC_FUTURE) {
        const skipLen = reader.readUint8();
        reader.skip(skipLen);
        continue;
      }

      if (record === REC_END) {
        if (stack.length > 1) {
          stack.pop();
        }
        continue;
      }

      if (record === REC_LINE) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        if (options & 0x04) reader.readUint8(); // line spacing
        if (options & 0x02) {
          // Ruler
          const nStops = reader.readUint8();
          for (let i = 0; i < nStops; i++) {
            reader.readUint8();
            reader.readUint16();
          }
        }
        const isNull = (options & 0x01) !== 0;
        const lineNode: ASTNode = { tag: REC_LINE, children: [], value: { isNull } };

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(lineNode);
        }
        if (!isNull) {
          stack.push(lineNode);
        }
        continue;
      }

      if (record === REC_CHAR) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        const typeface = reader.readUint8();

        let mtcode = 0;
        if (!(options & 0x20)) {
          mtcode = reader.readUint16();
        }

        let bits8 = 0;
        if (options & 0x04) {
          bits8 = reader.readUint8();
        }

        let bits16 = 0;
        if (options & 0x10) {
          bits16 = reader.readUint16();
        }

        const charNode: ASTNode = {
          tag: REC_CHAR,
          children: [],
          value: { typeface, mtcode: mtcode || bits16 || bits8, options },
        };

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(charNode);
        }
        continue;
      }

      if (record === REC_TMPL) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        const selector = reader.readUint8();

        const byte1 = reader.readUint8();
        let variation = byte1;
        if (byte1 & 0x80) {
          const byte2 = reader.readUint8();
          variation = (byte1 & 0x7f) | (byte2 << 8);
        }
        const tmplOptions = reader.readUint8();

        const tmplNode: ASTNode = {
          tag: REC_TMPL,
          children: [],
          value: { selector, variation, tmplOptions },
        };

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(tmplNode);
        }
        stack.push(tmplNode);
        continue;
      }

      if (record === REC_PILE) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        const halign = reader.readUint8();
        const valign = reader.readUint8();

        const pileNode: ASTNode = {
          tag: REC_PILE,
          children: [],
          value: { halign, valign },
        };

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(pileNode);
        }
        stack.push(pileNode);
        continue;
      }

      if (record === REC_MATRIX) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        const valign = reader.readUint8();
        const hJust = reader.readUint8();
        const vJust = reader.readUint8();
        const rows = reader.readUint8();
        const cols = reader.readUint8();

        const matrixNode: ASTNode = {
          tag: REC_MATRIX,
          children: [],
          value: { valign, hJust, vJust, rows, cols },
        };

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(matrixNode);
        }
        stack.push(matrixNode);
        continue;
      }

      if (record === REC_EMBELL) {
        const options = reader.readUint8();
        if (options & 0x08) reader.readNudge();
        const embell = reader.readUint8();

        const embellNode: ASTNode = {
          tag: REC_EMBELL,
          children: [],
          value: { embell },
        };

        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children.push(embellNode);

          // If embell is a prime, dot, or hat, it modifies the previous character
          if (
            embell === EMB_1DOT ||
            embell === EMB_2DOT ||
            embell === EMB_HAT ||
            embell === EMB_OBAR
          ) {
            if (parent.children.length >= 2) {
              const last = parent.children[parent.children.length - 1];
              const prev = parent.children[parent.children.length - 2];
              parent.children[parent.children.length - 2] = last;
              parent.children[parent.children.length - 1] = prev;
            }
          }
        }
        continue;
      }

      if (record === REC_SIZE) {
        reader.readUint8();
        reader.readUint8();
        continue;
      }

      if (record === REC_FONT_STYLE_DEF) {
        reader.readUint8();
        reader.readNullTerminatedString();
        continue;
      }

      if (record === REC_FONT_DEF) {
        reader.readUint8();
        reader.readNullTerminatedString();
        continue;
      }

      if (record === REC_COLOR) {
        reader.readUint8();
        continue;
      }

      if (record === REC_COLOR_DEF) {
        const cOptions = reader.readUint8();
        reader.skip(cOptions & 0x01 ? 4 : 3);
        if (cOptions & 0x04) reader.readNullTerminatedString();
        continue;
      }

      if (record === REC_EQN_PREFS) {
        reader.readUint8();
        const sz = reader.readUint8();
        reader.readDimensionArrays(sz);
        const sp = reader.readUint8();
        reader.readDimensionArrays(sp);
        const st = reader.readUint8();
        reader.skip(st);
        continue;
      }

      if (record === REC_ENCODING_DEF) {
        reader.readNullTerminatedString();
        continue;
      }
    }

    const latex = astToLatex(rootNode).trim();
    return latex || null;
  } catch (err) {
    console.warn('Error parsing MTEF bytes:', err);
    return null;
  }
}

/**
 * Translates MTEF AST into clean LaTeX
 */
function astToLatex(node: ASTNode): string {
  if (!node) return '';

  switch (node.tag) {
    case REC_ROOT: {
      return node.children.map(astToLatex).join('');
    }

    case REC_LINE: {
      return node.children.map(astToLatex).join('');
    }

    case REC_CHAR: {
      const { mtcode, typeface } = node.value || {};
      if (!mtcode) return '';

      // Check special math symbols table
      if (SPECIAL_MTCODES[mtcode]) {
        return SPECIAL_MTCODES[mtcode];
      }

      // ASCII printable characters
      if (mtcode >= 0x20 && mtcode <= 0x7e) {
        const char = String.fromCharCode(mtcode);
        if (char === '{' || char === '}') return `\\${char}`;
        if (char === '%' || char === '&' || char === '$' || char === '#') return `\\${char}`;
        if (char === '_') return '\\_';
        return char;
      }

      // Unicode character fallback
      return String.fromCharCode(mtcode);
    }

    case REC_EMBELL: {
      const embell = node.value?.embell;
      switch (embell) {
        case EMB_1PRIME:
          return "'";
        case EMB_2PRIME:
          return "''";
        case EMB_3PRIME:
          return "'''";
        case EMB_1DOT:
          return '\\dot ';
        case EMB_2DOT:
          return '\\ddot ';
        case EMB_HAT:
          return '\\hat ';
        case EMB_OBAR:
          return '\\bar ';
        case EMB_TILDE:
          return '\\tilde ';
        default:
          return '';
      }
    }

    case REC_TMPL: {
      const { selector, variation } = node.value || {};
      const ch = node.children;

      switch (selector) {
        case TM_PAREN: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\left( ${main} \\right)`;
        }

        case TM_BRACK: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\left[ ${main} \\right]`;
        }

        case TM_BRACE: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\left\\{ \\begin{array}{l} ${main} \\end{array} \\right.`;
        }

        case TM_BAR: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\left| ${main} \\right|`;
        }

        case TM_DBAR: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\left\\| ${main} \\right\\|`;
        }

        case TM_INTERVAL: {
          // Parse interval fences e.g. (a; b) or [a; b)
          const leftCode = (variation || 0) & 0x03;
          const rightCode = ((variation || 0) >> 4) & 0x03;

          let leftFence = '(';
          if (leftCode === 1) leftFence = ')';
          else if (leftCode === 2) leftFence = '[';
          else if (leftCode === 3) leftFence = ']';

          let rightFence = ')';
          if (rightCode === 0) rightFence = '(';
          else if (rightCode === 2) rightFence = '[';
          else if (rightCode === 3) rightFence = ']';

          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `${leftFence}${main}${rightFence}`;
        }

        case TM_ROOT: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          const nth = ch[1] ? astToLatex(ch[1]) : '';
          if (nth) return `\\sqrt[${nth}]{${main}}`;
          return `\\sqrt{${main}}`;
        }

        case TM_FRACT: {
          const num = ch[0] ? astToLatex(ch[0]) : '';
          const den = ch[1] ? astToLatex(ch[1]) : '';
          return `\\frac{${num}}{${den}}`;
        }

        case TM_UBAR: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\underline{${main}}`;
        }

        case TM_OBAR: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\overline{${main}}`;
        }

        case TM_SUB: {
          const sub = ch[0] ? astToLatex(ch[0]) : '';
          return `_{${sub}}`;
        }

        case TM_SUP: {
          const sup = ch[0] ? astToLatex(ch[0]) : '';
          return `^{${sup}}`;
        }

        case TM_SUBSUP: {
          const sub = ch[0] ? astToLatex(ch[0]) : '';
          const sup = ch[1] ? astToLatex(ch[1]) : '';
          return `_{${sub}}^{${sup}}`;
        }

        case TM_VEC: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\overrightarrow{${main}}`;
        }

        case TM_HAT: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\widehat{${main}}`;
        }

        case TM_TILDE: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          return `\\tilde{${main}}`;
        }

        case TM_INTEG: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          const lower = ch[1] ? astToLatex(ch[1]) : '';
          const upper = ch[2] ? astToLatex(ch[2]) : '';
          if (lower || upper) {
            return `\\int_{${lower}}^{${upper}} {${main}}`;
          }
          return `\\int {${main}}`;
        }

        case TM_SUM: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          const lower = ch[1] ? astToLatex(ch[1]) : '';
          const upper = ch[2] ? astToLatex(ch[2]) : '';
          return `\\sum_{${lower}}^{${upper}} {${main}}`;
        }

        case TM_LIM: {
          const main = ch[0] ? astToLatex(ch[0]) : '';
          const lower = ch[1] ? astToLatex(ch[1]) : '';
          return `\\lim_{${lower}} {${main}}`;
        }

        default:
          return ch.map(astToLatex).join('');
      }
    }

    case REC_PILE:
    case REC_MATRIX: {
      return node.children.map(astToLatex).join(' ');
    }

    default:
      return node.children.map(astToLatex).join('');
  }
}

/**
 * Extracts MTEF stream from an OLE Compound Document (.bin file)
 */
export function parseMtefFromOleBuffer(buffer: ArrayBuffer | Uint8Array): string | null {
  try {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    // 1. First try parsing with CFB (Compound File Binary)
    try {
      const cfb = CFB.read(uint8 as any, { type: 'buffer' });
      if (cfb && cfb.FileIndex) {
        for (const file of cfb.FileIndex) {
          const name = file.name || '';
          if (name.toLowerCase().includes('equation native')) {
            const content = file.content;
            if (content && content.length > 28) {
              const bytes = new Uint8Array(content);
              const mtefData = bytes.subarray(28);
              const latex = parseMtefBytesToLatex(mtefData);
              if (latex && latex.trim().length > 0) {
                return latex.trim();
              }
            }
          }
        }
      }
    } catch {
      // Continue to pattern scanning
    }

    // 2. Scan buffer for 28-byte EQNOLEFILEHDR magic: cbHdr === 28 (0x1C 0x00)
    for (let i = 0; i <= uint8.length - 35; i++) {
      if (uint8[i] === 0x1c && uint8[i + 1] === 0x00) {
        // Check if byte i+28 is MTEF version (3 or 5)
        const mtefVer = uint8[i + 28];
        if (mtefVer === 3 || mtefVer === 5) {
          const mtefSlice = uint8.subarray(i + 28);
          const latex = parseMtefBytesToLatex(mtefSlice);
          if (latex && latex.trim().length > 0) {
            return latex.trim();
          }
        }
      }
    }

    // 3. Scan directly for raw MTEF header bytes: 0x05 0x01 (version 5, Windows) or 0x03 0x01
    for (let i = 0; i <= uint8.length - 10; i++) {
      if ((uint8[i] === 0x05 || uint8[i] === 0x03) && (uint8[i + 1] === 0x01 || uint8[i + 1] === 0x00)) {
        const mtefSlice = uint8.subarray(i);
        const latex = parseMtefBytesToLatex(mtefSlice);
        if (latex && latex.trim().length > 0) {
          return latex.trim();
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Error reading OLE buffer for MTEF:', err);
    return null;
  }
}
