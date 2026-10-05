import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as wmf from 'wmf';
import { parseMtefFromOleBuffer } from './mtefParser';
import { convertMetafileToDataUrl } from './metafileConverter';
import { Question } from '../types/exam';

const XML_ELEMENT_NODE = 1;
const XML_TEXT_NODE = 3;

/**
 * Helper to get direct child element with matching lowercase tag name
 */
function getDirectChild(parent: Element, tagLower: string): Element | null {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === XML_ELEMENT_NODE) {
      const childEl = child as Element;
      const lName = (childEl.localName || childEl.tagName.split(':').pop() || '').toLowerCase();
      if (lName === tagLower) return childEl;
    }
  }
  return null;
}

/**
 * Cleans and normalizes Unicode math symbols into LaTeX equivalents
 */
function cleanMathText(t: string): string {
  return t
    .replace(/\u2212/g, '-') // Unicode minus sign
    .replace(/\u2032/g, "'") // Unicode prime for derivative f'(x)
    .replace(/\u02B9/g, "'") // Modifier prime
    .replace(/\u00B0/g, '^\\circ ') // Degree symbol
    .replace(/\u221E/g, '\\infty ')
    .replace(/\u2208/g, '\\in ')
    .replace(/\u2209/g, '\\notin ')
    .replace(/\u2282/g, '\\subset ')
    .replace(/\u222A/g, '\\cup ')
    .replace(/\u2229/g, '\\cap ')
    .replace(/\u2264/g, '\\le ')
    .replace(/\u2265/g, '\\ge ')
    .replace(/\u2260/g, '\\ne ')
    .replace(/\u2248/g, '\\approx ')
    .replace(/\u2192/g, '\\to ')
    .replace(/\u21D2/g, '\\Rightarrow ')
    .replace(/\u21D4/g, '\\Leftrightarrow ')
    .replace(/\u03C0/g, '\\pi ')
    .replace(/\u03B1/g, '\\alpha ')
    .replace(/\u03B2/g, '\\beta ')
    .replace(/\u03B3/g, '\\gamma ')
    .replace(/\u03B8/g, '\\theta ')
    .replace(/\u0394/g, '\\Delta ')
    .replace(/\u03BB/g, '\\lambda ')
    .replace(/\u222B/g, '\\int ')
    .replace(/\u221A/g, '\\sqrt')
    .replace(/\u00B1/g, '\\pm ')
    .replace(/\u2205/g, '\\emptyset ')
    .replace(/\u211D/g, '\\mathbb{R}')
    .replace(/\u2124/g, '\\mathbb{Z}')
    .replace(/\u2115/g, '\\mathbb{N}')
    .replace(/\u211A/g, '\\mathbb{Q}')
    .replace(/[\u22C5\u2219]/g, '\\cdot ')
    .replace(/\u00D7/g, '\\times ')
    .replace(/\u22A5/g, '\\perp ')
    .replace(/\u2225/g, '\\parallel ')
    .replace(/\u2026/g, '\\dots ');
}

function parseXmlDocument(xmlString: string): Document | null {
  try {
    let ParserClass: any;
    if (typeof DOMParser !== 'undefined') {
      ParserClass = DOMParser;
    } else {
      try {
        // Fallback for Node environments/tests
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ParserClass = require('@xmldom/xmldom').DOMParser;
      } catch {
        return null;
      }
    }
    const parser = new ParserClass();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    if (doc.getElementsByTagName && doc.getElementsByTagName('parsererror').length > 0) {
      return null;
    }
    return doc;
  } catch (err) {
    console.error('Error parsing XML document:', err);
    return null;
  }
}

/**
 * Extracts raw text, converts OMML math formulas into LaTeX, and extracts embedded diagrams
 * (bảng biến thiên, đồ thị hàm số, hình học không gian) into Base64 Data URLs from a .docx file.
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Build relationship map: rId -> data URL, and oleLatexMap: rId/path -> LaTeX string
    const relsMap = new Map<string, string>();
    const oleLatexMap = new Map<string, string>();

    // 1.1 Extract all embedded OLE objects (MathType binary equations) from word/embeddings/
    const oleFiles = zip.file(/^word\/embeddings\/.*\.bin$/i);
    for (const oleFile of oleFiles) {
      try {
        const oleBuf = await oleFile.async('arraybuffer');
        const latex = parseMtefFromOleBuffer(oleBuf);
        if (latex && latex.trim().length > 0) {
          const cleanLatex = latex.trim();
          oleLatexMap.set(oleFile.name, cleanLatex);
          const relName = oleFile.name.replace(/^word\//, '');
          oleLatexMap.set(relName, cleanLatex);
          const baseName = oleFile.name.split('/').pop() || '';
          oleLatexMap.set(baseName, cleanLatex);
        }
      } catch (oleErr) {
        console.warn('Error reading OLE file:', oleFile.name, oleErr);
      }
    }

    // 1.2 Parse document relationships
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      try {
        const relsXml = await relsFile.async('text');
        const relsDoc = parseXmlDocument(relsXml);
        if (relsDoc) {
          const relationships = relsDoc.getElementsByTagName('Relationship');

          for (let i = 0; i < relationships.length; i++) {
            const rel = relationships[i];
            const id = rel.getAttribute('Id');
            let target = rel.getAttribute('Target') || '';
            const type = rel.getAttribute('Type') || '';

            if (!id) continue;

            // Check if this relationship is an OLE object (.bin)
            if (type.includes('oleObject') || target.toLowerCase().endsWith('.bin')) {
              let olePath = target;
              if (olePath.startsWith('../')) {
                olePath = olePath.replace(/^\.\.\//, '');
              } else if (!olePath.startsWith('word/')) {
                olePath = 'word/' + olePath.replace(/^\//, '');
              }

              const existingLatex =
                oleLatexMap.get(olePath) ||
                oleLatexMap.get(target) ||
                oleLatexMap.get(target.split('/').pop() || '');

              if (existingLatex) {
                oleLatexMap.set(id, existingLatex);
              } else {
                const binFile = zip.file(olePath);
                if (binFile) {
                  try {
                    const binBuf = await binFile.async('arraybuffer');
                    const parsed = parseMtefFromOleBuffer(binBuf);
                    if (parsed) {
                      oleLatexMap.set(id, parsed.trim());
                      oleLatexMap.set(olePath, parsed.trim());
                    }
                  } catch {}
                }
              }
            }

            // Check if this relationship is an image
            if (type.includes('image') || target.toLowerCase().includes('media/')) {
              let zipPath = target;
              if (zipPath.startsWith('../')) {
                zipPath = zipPath.replace(/^\.\.\//, '');
              } else if (!zipPath.startsWith('word/')) {
                zipPath = 'word/' + zipPath.replace(/^\//, '');
              }

              const imgFile = zip.file(zipPath);
              if (imgFile) {
                try {
                  const ext = zipPath.split('.').pop()?.toLowerCase() || 'png';

                  // Handle WMF and EMF conversion
                  if (ext === 'wmf' || ext === 'emf') {
                    let converted = false;
                    try {
                      const imgBuf = await imgFile.async('arraybuffer');

                      // Try parsing MTEF from WMF comments first if it's a MathType equation
                      const mtefLatex = parseMtefFromOleBuffer(imgBuf);
                      if (mtefLatex && mtefLatex.trim().length > 0) {
                        oleLatexMap.set(id, mtefLatex.trim());
                      }

                      // Convert metafile (vector diagram / embedded graphic) to browser-safe data URL
                      const convertedUrl = convertMetafileToDataUrl(imgBuf, ext);
                      if (convertedUrl) {
                        relsMap.set(id, convertedUrl);
                        converted = true;
                      }
                    } catch (convErr) {
                      console.warn('WMF/EMF conversion error:', convErr);
                    }

                    if (converted) continue;
                  }

                  const base64 = await imgFile.async('base64');
                  let mime = 'image/png';
                  if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                  else if (ext === 'gif') mime = 'image/gif';
                  else if (ext === 'svg') mime = 'image/svg+xml';
                  else if (ext === 'webp') mime = 'image/webp';
                  else if (ext === 'wmf') mime = 'image/x-wmf';
                  else if (ext === 'emf') mime = 'image/x-emf';

                  relsMap.set(id, `data:${mime};base64,${base64}`);
                } catch (imgErr) {
                  console.warn('Could not read image file from zip:', zipPath, imgErr);
                }
              }
            }
          }
        }
      } catch (relsErr) {
        console.warn('Error parsing document.xml.rels:', relsErr);
      }
    }

    // 2. Parse word/document.xml with both relsMap and oleLatexMap
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const xmlString = await docXmlFile.async('text');
      const parsedText = parseDocxXmlToText(xmlString, relsMap, oleLatexMap);
      if (parsedText && parsedText.trim().length > 20) {
        return parsedText;
      }
    }
  } catch (zipError) {
    console.warn('Direct docx XML extraction failed, falling back to mammoth:', zipError);
  }

  // Fallback to Mammoth extraction
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from .docx via mammoth:', error);
    throw new Error('Không thể đọc file .docx. Vui lòng đảm bảo file không bị khóa hoặc bị lỗi cấu trúc.');
  }
}

/**
 * Searches an XML node for image references (<a:blip> or <v:imagedata>)
 */
function extractImageFromNode(node: Element, relsMap: Map<string, string>): string | null {
  const blips = node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', 'blip') : node.getElementsByTagName('blip');
  for (let i = 0; i < blips.length; i++) {
    const rId =
      blips[i].getAttribute('r:embed') ||
      (blips[i].getAttributeNS && blips[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')) ||
      blips[i].getAttribute('embed') ||
      blips[i].getAttribute('r:link') ||
      (blips[i].getAttributeNS && blips[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'link')) ||
      blips[i].getAttribute('link');
    if (rId && relsMap.has(rId)) {
      return relsMap.get(rId)!;
    }
  }

  const imgDatas = node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', 'imagedata') : node.getElementsByTagName('imagedata');
  for (let i = 0; i < imgDatas.length; i++) {
    const rId =
      imgDatas[i].getAttribute('r:id') ||
      (imgDatas[i].getAttributeNS && imgDatas[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')) ||
      imgDatas[i].getAttribute('id') ||
      imgDatas[i].getAttribute('o:relid') ||
      imgDatas[i].getAttribute('relid');
    if (rId && relsMap.has(rId)) {
      return relsMap.get(rId)!;
    }
  }

  return null;
}

/**
 * Checks if an XML node contains a MathType OLE equation or an explicit math equation title/text
 */
function extractFormulaTextFromNode(node: Element, oleLatexMap: Map<string, string>): string | null {
  // 1. Check all OLE object tags <o:OLEObject>
  const oles = node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', 'OLEObject') : node.getElementsByTagName('OLEObject');
  for (let i = 0; i < oles.length; i++) {
    const rId =
      oles[i].getAttribute('r:id') ||
      (oles[i].getAttributeNS && oles[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')) ||
      oles[i].getAttribute('id');
    if (rId && oleLatexMap.has(rId)) {
      return oleLatexMap.get(rId)!;
    }
  }

  // 2. Check <v:imagedata> for rId in oleLatexMap or math titles
  const imgDatas = node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', 'imagedata') : node.getElementsByTagName('imagedata');
  for (let i = 0; i < imgDatas.length; i++) {
    const rId =
      imgDatas[i].getAttribute('r:id') ||
      (imgDatas[i].getAttributeNS && imgDatas[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')) ||
      imgDatas[i].getAttribute('id') ||
      imgDatas[i].getAttribute('o:relid') ||
      imgDatas[i].getAttribute('relid');
    if (rId && oleLatexMap.has(rId)) {
      return oleLatexMap.get(rId)!;
    }

    const oTitle = imgDatas[i].getAttribute('o:title') || imgDatas[i].getAttribute('title');
    if (oTitle && isMathFormulaText(oTitle)) {
      return oTitle.trim();
    }
  }

  // 3. Check <v:shape> alt or title
  const shapes = node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', 'shape') : node.getElementsByTagName('shape');
  for (let i = 0; i < shapes.length; i++) {
    const alt = shapes[i].getAttribute('alt') || shapes[i].getAttribute('title');
    if (alt && isMathFormulaText(alt)) {
      return alt.trim();
    }
  }

  // 4. Check any element with id / r:id matching oleLatexMap
  const allEls = node.getElementsByTagName ? node.getElementsByTagName('*') : [];
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    const rId =
      el.getAttribute('r:id') ||
      (el.getAttributeNS && el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')) ||
      el.getAttribute('id') ||
      el.getAttribute('r:embed');
    if (rId && oleLatexMap.has(rId)) {
      return oleLatexMap.get(rId)!;
    }
  }

  return null;
}

function isMathFormulaText(str: string): boolean {
  if (!str || str.trim().length < 2) return false;
  const s = str.trim().toLowerCase();
  if (s.endsWith('.png') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.wmf') || s.endsWith('.emf') || s.endsWith('.gif')) {
    return false;
  }
  return /[=<>+\-^_\\]/.test(str) || /^[a-zA-Z]\s*\([a-zA-Z0-9,\s]+\)/.test(str);
}

function hasTextContent(p: Element): boolean {
  const textNodes = p.getElementsByTagNameNS ? p.getElementsByTagNameNS('*', 't') : p.getElementsByTagName('t');
  for (let i = 0; i < textNodes.length; i++) {
    if (textNodes[i].textContent && textNodes[i].textContent!.trim().length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Parses word/document.xml into text with LaTeX equations from MathType OLE, m:oMath, and diagram images
 */
function parseDocxXmlToText(
  xmlString: string,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  const xmlDoc = parseXmlDocument(xmlString);
  if (!xmlDoc) return '';

  const body = (xmlDoc.getElementsByTagNameNS && xmlDoc.getElementsByTagNameNS('*', 'body')[0]) || xmlDoc.getElementsByTagName('body')[0];
  if (!body) return '';

  return processXmlContainer(body, relsMap, oleLatexMap);
}

function processXmlContainer(
  element: Element,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  let output = '';

  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType !== XML_ELEMENT_NODE) continue;

    const el = node as Element;
    const local = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();

    if (local === 'p') {
      output += processParagraph(el, relsMap, oleLatexMap) + '\n';
    } else if (local === 'tbl') {
      output += processTable(el, relsMap, oleLatexMap) + '\n';
    } else if (local === 'sdt') {
      output += processXmlContainer(el, relsMap, oleLatexMap);
    } else if (local === 'drawing' || local === 'pict' || local === 'object') {
      const formula = extractFormulaTextFromNode(el, oleLatexMap);
      if (formula) {
        output += ` $${formula}$ `;
      } else {
        const img = extractImageFromNode(el, relsMap);
        if (img) {
          output += `\n![Hình vẽ](${img})\n`;
        }
      }
    } else {
      output += processXmlContainer(el, relsMap, oleLatexMap);
    }
  }

  return output;
}

function processTable(
  tbl: Element,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  let output = '';
  const rows = tbl.getElementsByTagNameNS('*', 'tr');

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].getElementsByTagNameNS('*', 'tc');
    const cellTexts: string[] = [];
    for (let c = 0; c < cells.length; c++) {
      cellTexts.push(processParagraphContainer(cells[c], relsMap, oleLatexMap).trim());
    }
    output += cellTexts.join('\t') + '\n';
  }

  return output;
}

function processParagraphContainer(
  container: Element,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  let output = '';
  const paras = container.getElementsByTagNameNS('*', 'p');
  if (paras.length > 0) {
    for (let p = 0; p < paras.length; p++) {
      output += processParagraph(paras[p], relsMap, oleLatexMap) + ' ';
    }
  } else {
    output += processParagraph(container, relsMap, oleLatexMap);
  }
  return output;
}

function processParagraph(
  p: Element,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  let text = '';
  const hasText = hasTextContent(p);

  for (let i = 0; i < p.childNodes.length; i++) {
    const node = p.childNodes[i];
    if (node.nodeType !== XML_ELEMENT_NODE) continue;

    const el = node as Element;
    const local = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();

    if (local === 'r') {
      text += processRun(el, relsMap, oleLatexMap);
    } else if (local === 'omath' || local === 'omathpara') {
      const latex = convertOmmlToLatex(el).trim();
      if (latex) {
        text += ` $${latex}$ `;
      }
    } else if (local === 'sdt') {
      const sdtMath = el.getElementsByTagNameNS ? el.getElementsByTagNameNS('*', 'oMath') : el.getElementsByTagName('oMath');
      if (sdtMath.length > 0) {
        for (let m = 0; m < sdtMath.length; m++) {
          const latex = convertOmmlToLatex(sdtMath[m]).trim();
          if (latex) text += ` $${latex}$ `;
        }
      } else {
        text += processParagraph(el, relsMap, oleLatexMap);
      }
    } else if (local === 'drawing' || local === 'pict' || local === 'object') {
      const formula = extractFormulaTextFromNode(el, oleLatexMap);
      if (formula) {
        text += ` $${formula}$ `;
      } else {
        const img = extractImageFromNode(el, relsMap);
        if (img) {
          text += `\n![Hình vẽ](${img})\n`;
        }
      }
    } else if (local === 'tab') {
      text += '\t';
    } else if (local === 'br' || local === 'cr' || local === 'lastrenderedpagebreak') {
      text += '\n';
    } else if (local === 'hyperlink') {
      text += processParagraph(el, relsMap, oleLatexMap);
    }
  }

  return text;
}

function processRun(
  r: Element,
  relsMap: Map<string, string>,
  oleLatexMap: Map<string, string>
): string {
  let text = '';

  for (let i = 0; i < r.childNodes.length; i++) {
    const node = r.childNodes[i];
    if (node.nodeType !== XML_ELEMENT_NODE) continue;

    const el = node as Element;
    const local = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();

    if (local === 't') {
      text += el.textContent || '';
    } else if (local === 'tab') {
      text += '\t';
    } else if (local === 'br' || local === 'cr' || local === 'lastrenderedpagebreak') {
      text += '\n';
    } else if (local === 'drawing' || local === 'pict' || local === 'object') {
      const formula = extractFormulaTextFromNode(el, oleLatexMap);
      if (formula) {
        text += ` $${formula}$ `;
      } else {
        const img = extractImageFromNode(el, relsMap);
        if (img) {
          text += `\n![Hình vẽ](${img})\n`;
        }
      }
    } else if (local === 'omath' || local === 'omathpara') {
      const latex = convertOmmlToLatex(el).trim();
      if (latex) {
        text += ` $${latex}$ `;
      }
    }
  }

  return text;
}

/**
 * Converts an Office Math (m:oMath) element into a LaTeX string
 */
function convertOmmlToLatex(el: Element): string {
  const local = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();

  // Text inside math: clean Unicode symbols
  if (local === 't') {
    return cleanMathText(el.textContent || '');
  }

  // Fraction: <m:f> -> \frac{num}{den}
  if (local === 'f') {
    const num = getDirectChild(el, 'num') || el.getElementsByTagNameNS('*', 'num')[0];
    const den = getDirectChild(el, 'den') || el.getElementsByTagNameNS('*', 'den')[0];
    const numStr = num ? convertOmmlChildren(num) : '';
    const denStr = den ? convertOmmlChildren(den) : '';
    return `\\frac{${numStr}}{${denStr}}`;
  }

  // Radical (Square root / Root): <m:rad> -> \sqrt{e} or \sqrt[deg]{e}
  if (local === 'rad') {
    const deg = el.getElementsByTagNameNS('*', 'deg')[0];
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const degStr = deg && deg.textContent?.trim() ? `[${convertOmmlChildren(deg)}]` : '';
    const eStr = e ? convertOmmlChildren(e) : '';
    return `\\sqrt${degStr}{${eStr}}`;
  }

  // Superscript: <m:ssup> -> {e}^{sup}
  if (local === 'ssup') {
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const sup = getDirectChild(el, 'sup') || el.getElementsByTagNameNS('*', 'sup')[0];
    const eStr = e ? convertOmmlChildren(e) : '';
    const supStr = sup ? convertOmmlChildren(sup) : '';
    return `{${eStr}}^{${supStr}}`;
  }

  // Subscript: <m:ssub> -> {e}_{sub}
  if (local === 'ssub') {
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const sub = getDirectChild(el, 'sub') || el.getElementsByTagNameNS('*', 'sub')[0];
    const eStr = e ? convertOmmlChildren(e) : '';
    const subStr = sub ? convertOmmlChildren(sub) : '';
    return `{${eStr}}_{${subStr}}`;
  }

  // Subscript + Superscript: <m:ssubsup> -> {e}_{sub}^{sup}
  if (local === 'ssubsup') {
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const sub = getDirectChild(el, 'sub') || el.getElementsByTagNameNS('*', 'sub')[0];
    const sup = getDirectChild(el, 'sup') || el.getElementsByTagNameNS('*', 'sup')[0];
    const eStr = e ? convertOmmlChildren(e) : '';
    const subStr = sub ? convertOmmlChildren(sub) : '';
    const supStr = sup ? convertOmmlChildren(sup) : '';
    return `{${eStr}}_{${subStr}}^{${supStr}}`;
  }

  // Delimiter (parentheses, brackets, intervals): <m:d>
  if (local === 'd') {
    let begChr = '(';
    let endChr = ')';
    let sepChr = ';';

    const dPr = getDirectChild(el, 'dpr');
    if (dPr) {
      const bEl = getDirectChild(dPr, 'begchr');
      if (bEl) begChr = bEl.getAttribute('m:val') || bEl.getAttribute('val') || '';
      const eEl = getDirectChild(dPr, 'endchr');
      if (eEl) endChr = eEl.getAttribute('m:val') || eEl.getAttribute('val') || '';
      const sEl = getDirectChild(dPr, 'sepchr');
      if (sEl) sepChr = sEl.getAttribute('m:val') || sEl.getAttribute('val') || ';';
    }

    const eList: string[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === XML_ELEMENT_NODE) {
        const childEl = child as Element;
        const childLocal = (childEl.localName || childEl.tagName.split(':').pop() || '').toLowerCase();
        if (childLocal === 'e') {
          eList.push(convertOmmlChildren(childEl).trim());
        }
      }
    }

    const separator = sepChr ? `${sepChr} ` : '; ';
    const inner = eList.join(separator);

    if (begChr === '{' && !endChr) {
      return `\\begin{cases} ${eList.join(' \\\\ ')} \\end{cases}`;
    }

    const open = begChr === '{' ? '\\{' : begChr;
    const close = endChr === '}' ? '\\}' : endChr;
    return `${open}${inner}${close}`;
  }

  // Accent / Vector / Dot / Bar: <m:acc> -> \vec{e}, \overrightarrow{e}, \overline{e}
  if (local === 'acc') {
    const accPr = getDirectChild(el, 'accpr');
    let chr = '→';
    if (accPr) {
      const chrEl = getDirectChild(accPr, 'chr');
      if (chrEl) chr = chrEl.getAttribute('m:val') || chrEl.getAttribute('val') || '→';
    }
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const eStr = e ? convertOmmlChildren(e) : '';

    if (chr === '¯' || chr === '-') {
      return `\\overline{${eStr}}`;
    }
    if (chr === '^') {
      return `\\hat{${eStr}}`;
    }
    if (chr === '.') {
      return `\\dot{${eStr}}`;
    }
    if (eStr.length > 1) {
      return `\\overrightarrow{${eStr}}`;
    }
    return `\\vec{${eStr}}`;
  }

  // Overbar / Underbar: <m:bar>
  if (local === 'bar') {
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const eStr = e ? convertOmmlChildren(e) : '';
    return `\\overline{${eStr}}`;
  }

  // N-ary (Sum, Product, Integral): <m:nary>
  if (local === 'nary') {
    let chr = '∫';
    const naryPr = getDirectChild(el, 'narypr');
    if (naryPr) {
      const chrEl = getDirectChild(naryPr, 'chr');
      if (chrEl) chr = chrEl.getAttribute('m:val') || chrEl.getAttribute('val') || '∫';
    }

    let op = '\\int';
    if (chr === '∑') op = '\\sum';
    else if (chr === '∏') op = '\\prod';
    else if (chr === '∬') op = '\\iint';
    else if (chr === '∭') op = '\\iiint';

    const sub = getDirectChild(el, 'sub') || el.getElementsByTagNameNS('*', 'sub')[0];
    const sup = getDirectChild(el, 'sup') || el.getElementsByTagNameNS('*', 'sup')[0];
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];

    const subStr = sub && sub.textContent?.trim() ? `_{${convertOmmlChildren(sub)}}` : '';
    const supStr = sup && sup.textContent?.trim() ? `^{${convertOmmlChildren(sup)}}` : '';
    const eStr = e ? convertOmmlChildren(e) : '';
    return `${op}${subStr}${supStr} ${eStr}`;
  }

  // Limits: <m:limLow> -> \lim_{x \to 0}
  if (local === 'limlow') {
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const lim = getDirectChild(el, 'lim') || el.getElementsByTagNameNS('*', 'lim')[0];
    const eStr = e ? convertOmmlChildren(e) : '\\lim';
    const limStr = lim ? convertOmmlChildren(lim) : '';
    return `${eStr}_{${limStr}} `;
  }

  // Function: <m:func> -> \sin, \cos, \ln, etc.
  if (local === 'func') {
    const fName = getDirectChild(el, 'fname') || el.getElementsByTagNameNS('*', 'fName')[0];
    const e = getDirectChild(el, 'e') || el.getElementsByTagNameNS('*', 'e')[0];
    const fnStr = fName ? convertOmmlChildren(fName).trim() : '';
    const eStr = e ? convertOmmlChildren(e) : '';
    return `${fnStr} ${eStr}`;
  }

  // Equation Array / System: <m:eqArr>
  if (local === 'eqarr') {
    const rows: string[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === XML_ELEMENT_NODE) {
        rows.push(convertOmmlChildren(child as Element).trim());
      }
    }
    return `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
  }

  return convertOmmlChildren(el);
}

function convertOmmlChildren(el: Element): string {
  let result = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === XML_ELEMENT_NODE) {
      result += convertOmmlToLatex(node as Element);
    } else if (node.nodeType === XML_TEXT_NODE) {
      result += cleanMathText(node.textContent || '');
    }
  }
  return result;
}

/**
 * Extracts Exam Metadata (Mã đề, Tiêu đề, Môn học) from text
 */
export function extractExamMetadata(text: string): {
  code?: string;
  title?: string;
  subject?: string;
} {
  const meta: { code?: string; title?: string; subject?: string } = {};

  // Find Exam Code: "Mã đề: 611", "Mã đề thi: 101", "Mã đề thi: 611"
  const codeMatch = /(?:Mã\s+đề(?:\s+thi)?)\s*[:.\-–]\s*([A-Za-z0-9_\-]+)/i.exec(text);
  if (codeMatch) {
    meta.code = codeMatch[1].trim();
  }

  // Find Subject: "Môn: Toán 12", "MÔN: TOÁN"
  const subjectMatch = /(?:Môn(?:\s+học)?)\s*[:.\-–]\s*([^\n\r]+)/i.exec(text);
  if (subjectMatch) {
    meta.subject = subjectMatch[1].trim();
  }

  // Find Title: "ĐỀ KHẢO SÁT...", "ĐỀ KIỂM TRA ĐỊNH KỲ..."
  const titleMatch = /(?:ĐỀ\s+(?:THI|KIỂM\s+TRA|KHẢO\s+SÁT)[^\n\r]+)/i.exec(text);
  if (titleMatch) {
    meta.title = titleMatch[0].trim();
  }

  return meta;
}

/**
 * Splits document text into questions respecting the official 3 sections:
 * - PHẦN I: Trắc nghiệm 4 lựa chọn (12 câu)
 * - PHẦN II: Trắc nghiệm Đúng/Sai (4 câu, mỗi câu có 4 ý a, b, c, d)
 * - PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu)
 */
export function parseQuestionsFromText(text: string): Question[] {
  if (!text || text.trim().length === 0) return [];

  // Normalize line endings
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect Sections
  const p1Match = /(?:PHẦN\s*(?:I\b|1\b|THỨ\s*NHẤT)|PHAN\s*(?:I\b|1\b)|I\.\s*(?:PHẦN|CÂU|TRẮC))/i.exec(clean);
  const p2Match = /(?:PHẦN\s*(?:II\b|2\b|THỨ\s*HAI)|PHAN\s*(?:II\b|2\b)|II\.\s*(?:PHẦN|CÂU|TRẮC))/i.exec(clean);
  const p3Match = /(?:PHẦN\s*(?:III\b|3\b|THỨ\s*BA)|PHAN\s*(?:III\b|3\b)|III\.\s*(?:PHẦN|CÂU|TRẮC))/i.exec(clean);

  if (p2Match || p3Match) {
    const idx1 = p1Match ? p1Match.index : 0;
    const idx2 = p2Match ? p2Match.index : (p3Match ? p3Match.index : clean.length);
    const idx3 = p3Match ? p3Match.index : clean.length;

    const part1Text = p2Match ? clean.substring(idx1, idx2) : clean.substring(idx1, idx3);
    const part2Text = p2Match && p3Match ? clean.substring(idx2, idx3) : (p2Match ? clean.substring(idx2) : '');
    const part3Text = p3Match ? clean.substring(idx3) : '';

    const questions: Question[] = [];
    let currentGlobalOrder = 1;

    // Part 1: Multiple choice
    if (part1Text.trim().length > 0) {
      const p1Questions = parseSection1Questions(part1Text, currentGlobalOrder);
      questions.push(...p1Questions);
      currentGlobalOrder += p1Questions.length;
    }

    // Part 2: True/False
    if (part2Text.trim().length > 0) {
      const p2Questions = parseSection2Questions(part2Text, currentGlobalOrder);
      questions.push(...p2Questions);
      currentGlobalOrder += p2Questions.length;
    }

    // Part 3: Short answer
    if (part3Text.trim().length > 0) {
      const p3Questions = parseSection3Questions(part3Text, currentGlobalOrder);
      questions.push(...p3Questions);
    }

    if (questions.length > 0) {
      return questions;
    }
  }

  // Fallback: If sections are not explicitly marked, use generic block detection
  return parseAllQuestionsGeneric(clean);
}

/**
 * Parses Section 1 questions (Multiple Choice)
 */
function parseSection1Questions(text: string, startOrder: number): Question[] {
  const blocks = splitQuestionBlocks(text);
  return blocks.map((b, idx) => {
    const orderNumber = startOrder + idx;
    const id = `q-s1-${orderNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    return parseMultipleChoiceBlock(b.content, orderNumber, id);
  });
}

/**
 * Parses Section 2 questions (True / False)
 */
function parseSection2Questions(text: string, startOrder: number): Question[] {
  const blocks = splitQuestionBlocks(text);
  return blocks.map((b, idx) => {
    const orderNumber = startOrder + idx;
    const id = `q-s2-${orderNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    return parseTrueFalseBlock(b.content, orderNumber, id);
  });
}

/**
 * Parses Section 3 questions (Short Answer)
 */
function parseSection3Questions(text: string, startOrder: number): Question[] {
  const blocks = splitQuestionBlocks(text);
  return blocks.map((b, idx) => {
    const orderNumber = startOrder + idx;
    const id = `q-s3-${orderNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    return parseShortAnswerBlock(b.content, orderNumber, id);
  });
}

/**
 * Splits a text into question blocks based on markers like "Câu 1:", "Câu 2.", etc.
 */
function splitQuestionBlocks(text: string): Array<{ questionNumber: number; content: string }> {
  // Normalize whitespace, line breaks and non-breaking spaces
  const clean = text
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n|\r/g, '\n');

  // Match questions:
  // "Câu 1:", "Câu 01.", "CÂU 1 -", "Câu 1–", "Bài 1:", "Câu 1 (1.0 điểm):", "Câu 1 (NB):"
  // Preceded by start of string, newline, carriage return, tab, page breaks, spaces, or after punctuation/options
  const regex = /(?:^|[\n\r\t\f\v]|(?<=[.!?:\s\)\]])|(?<=[A-D]\.))\s*(?:Câu|Cau|Bài|Bai|Question)\s*(\d+)[\s:.\-–]*(?:\([^)]*\)[\s:.\-–]*)?/gi;
  const matches: Array<{ num: number; index: number; contentStart: number }> = [];

  let match;
  while ((match = regex.exec(clean)) !== null) {
    const num = parseInt(match[1], 10);
    const fullMatch = match[0];
    const contentStart = match.index + fullMatch.length;
    matches.push({ num, index: match.index, contentStart });
  }

  // Fallback: If no "Câu X" found, try numbered lists: "1.", "2.", "3."
  if (matches.length < 2) {
    const numListRegex = /(?:^|[\n\r\t])\s*(\d+)[\s:.\-–]+(?=[A-ZÀ-Ỹa-z\$\(])/g;
    let nMatch;
    const numMatches: typeof matches = [];
    while ((nMatch = numListRegex.exec(clean)) !== null) {
      const num = parseInt(nMatch[1], 10);
      const fullMatch = nMatch[0];
      const contentStart = nMatch.index + fullMatch.length;
      numMatches.push({ num, index: nMatch.index, contentStart });
    }
    if (numMatches.length >= 2) {
      matches.splice(0, matches.length, ...numMatches);
    }
  }

  if (matches.length === 0) {
    const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim().length > 15);
    return paragraphs.map((p, idx) => ({ questionNumber: idx + 1, content: p.trim() }));
  }

  const blocks: Array<{ questionNumber: number; content: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const rawContent = next
      ? clean.substring(current.contentStart, next.index)
      : clean.substring(current.contentStart);

    blocks.push({
      questionNumber: current.num,
      content: rawContent.trim(),
    });
  }

  return blocks;
}

/**
 * Extracts question diagrams while ignoring inline math formulas (alt='công thức')
 */
function extractQuestionImages(block: string): {
  imageUrl?: string;
  imageCaption?: string;
} {
  const allImages = Array.from(
    block.matchAll(/!\[([^\]]*)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g)
  );
  if (allImages.length === 0) return {};

  // Prioritize block diagrams (alt is not 'công thức', 'math', or 'formula')
  const diagram = allImages.find((m) => {
    const alt = m[1].toLowerCase().trim();
    return alt !== 'công thức' && alt !== 'math' && alt !== 'formula';
  });

  if (diagram) {
    const rawCaption = diagram[1]?.trim();
    const imageCaption = rawCaption && rawCaption !== 'Hình vẽ' && rawCaption !== 'công thức' ? rawCaption : undefined;
    return {
      imageUrl: diagram[2],
      imageCaption,
    };
  }

  return {
    imageUrl: allImages[0][2],
    imageCaption: allImages[0][1] && allImages[0][1] !== 'Hình vẽ' && allImages[0][1] !== 'công thức' ? allImages[0][1] : undefined
  };
}

/**
 * Normalizes math string and cleans up broken placeholders
 */
function cleanMathArtifacts(str: string): string {
  if (!str) return '';
  let res = str;

  // Convert any remaining broken formula placeholders into LaTeX
  res = res.replace(/(?:Cho\s+hàm\s+số|hàm\s+số)\s+!\[(?:công\s+thức|math|formula)\]\([^)]+\)/gi, 'Cho hàm số $y = f(x)$');
  res = res.replace(/!\[(?:công\s+thức|math|formula)\]\([^)]+\)/gi, '$y = f(x)$');
  res = res.replace(/(?:Cho\s+hàm\s+số|hàm\s+số)\s*[\[{(<]?\s*công\s+thức(?:\s+toán)?\s*[\]})>]?/gi, 'Cho hàm số $y = f(x)$');
  res = res.replace(/[\[{(<]\s*công\s+thức(?:\s+toán)?\s*[\]})>]/gi, '$y = f(x)$');
  res = res.replace(/\bcông\s+thức\s+toán\b/gi, '$y = f(x)$');

  // Wrap bare interval option text like "(-1; 0)" or "(0; 1)" or "[1; +\infty)" in $...$
  const trimmed = res.trim();
  if (/^[(\[][\s\-+\d\w,;/.\s\u221e\\]+[)\]][.,]?$/.test(trimmed) && !trimmed.includes('$')) {
    res = `$${trimmed.replace(/[.,]$/, '')}$`;
  }
  // Wrap math equality like "y = 2x + 1" or "F(x) = x^3 - 1"
  if (/^[a-zA-Z]('|\(x\))?\s*[=<>≤≥]\s*.+/.test(trimmed) && !trimmed.includes('$')) {
    res = `$${trimmed}$`;
  }
  // Wrap math symbols if not inside $
  if (/(\^|_|\\frac|\\sqrt|\\int|\\infty|\\vec|\\overrightarrow|\\mathbb)/.test(trimmed) && !trimmed.includes('$')) {
    res = `$${trimmed}$`;
  }

  return res;
}

/**
 * Parses a Multiple Choice question block (Section 1).
 * Extracts options A, B, C, D even when on the same line, 2 lines, or separated by spaces/tabs.
 * Preserves LaTeX equations and extracts embedded diagram images.
 */
function parseMultipleChoiceBlock(block: string, orderNumber: number, id: string): Question {
  const { imageUrl, imageCaption } = extractQuestionImages(block);

  // Option regex: A, B, C, D preceded by start of string, newline, tab, or space
  const regex = /(?:^|[\n\r\t\s])([A-D])\s*[\).:]\s*/g;
  const matches: Array<{ letter: 'A' | 'B' | 'C' | 'D'; letterIndex: number; contentStart: number }> = [];

  let m;
  while ((m = regex.exec(block)) !== null) {
    const letter = m[1] as 'A' | 'B' | 'C' | 'D';
    const fullMatch = m[0];
    const letterIndex = m.index + fullMatch.indexOf(letter);
    const contentStart = m.index + fullMatch.length;

    // Verify this match is NOT inside a math formula $...$
    const prefix = block.substring(0, letterIndex);
    const dollarCount = (prefix.match(/(?<!\\)\$/g) || []).length;
    if (dollarCount % 2 === 1) {
      continue; // Inside LaTeX math, ignore!
    }

    matches.push({ letter, letterIndex, contentStart });
  }

  // Find sequential A, B, C, D
  let seq: { a: typeof matches[0]; b: typeof matches[0]; c: typeof matches[0]; d: typeof matches[0] } | null = null;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].letter === 'A') {
      const a = matches[i];
      const b = matches.slice(i + 1).find((x) => x.letter === 'B' && x.letterIndex > a.letterIndex);
      if (!b) continue;
      const c = matches.slice(i + 1).find((x) => x.letter === 'C' && x.letterIndex > b.letterIndex);
      if (!c) continue;
      const d = matches.slice(i + 1).find((x) => x.letter === 'D' && x.letterIndex > c.letterIndex);
      if (!d) continue;
      seq = { a, b, c, d };
      break;
    }
  }

  if (seq) {
    let title = cleanMathArtifacts(block.substring(0, seq.a.letterIndex).trim());
    // If imageUrl is already extracted as dedicated diagram, remove redundant markdown image tag from title
    if (imageUrl && title.includes(imageUrl)) {
      title = title.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
    }

    const optA = cleanMathArtifacts(block.substring(seq.a.contentStart, seq.b.letterIndex).trim());
    const optB = cleanMathArtifacts(block.substring(seq.b.contentStart, seq.c.letterIndex).trim());
    const optC = cleanMathArtifacts(block.substring(seq.c.contentStart, seq.d.letterIndex).trim());
    let optD = block.substring(seq.d.contentStart).trim();

    // Check for explanation marker at the end of option D
    let explanation = '';
    let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';

    const explMatch = /(?:Lời giải|Hướng dẫn giải|HD|Giải chi tiết)\s*[:.\-–]\s*/i.exec(optD);
    if (explMatch) {
      explanation = optD.substring(explMatch.index + explMatch[0].length).trim();
      optD = optD.substring(0, explMatch.index).trim();

      const chosenMatch = /(?:Chọn|Đáp án)\s+([A-D])\b/i.exec(explanation);
      if (chosenMatch) {
        correctOption = chosenMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      }
    }
    optD = cleanMathArtifacts(optD);

    return {
      id,
      section: 1,
      orderNumber,
      type: 'multiple_choice',
      title: title || `Câu hỏi ${orderNumber}`,
      imageUrl,
      imageCaption,
      options: [
        { id: 'A', content: optA || 'Phương án A' },
        { id: 'B', content: optB || 'Phương án B' },
        { id: 'C', content: optC || 'Phương án C' },
        { id: 'D', content: optD || 'Phương án D' },
      ],
      correctOption,
      explanation: cleanMathArtifacts(explanation) || 'Lời giải chi tiết cho câu hỏi.',
      difficulty: 'Thông hiểu',
    };
  }

  // Fallback: If 4 options not cleanly found, extract whatever option letters are present
  const fallbackParts = block.split(/(?:^|[\n\r\t])\s*([A-D])\s*[\).:]\s*/);
  if (fallbackParts.length >= 3) {
    const title = fallbackParts[0].trim();
    const options: Array<{ id: 'A' | 'B' | 'C' | 'D'; content: string }> = [];
    for (let i = 1; i < fallbackParts.length; i += 2) {
      const letter = fallbackParts[i].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      options.push({
        id: letter,
        content: fallbackParts[i + 1]?.trim() || '',
      });
    }
    // Ensure 4 options
    const required = ['A', 'B', 'C', 'D'] as const;
    required.forEach((r) => {
      if (!options.some((o) => o.id === r)) {
        options.push({ id: r, content: `Phương án ${r}` });
      }
    });

    return {
      id,
      section: 1,
      orderNumber,
      type: 'multiple_choice',
      title: title || `Câu hỏi ${orderNumber}`,
      imageUrl,
      imageCaption,
      options: options.sort((a, b) => a.id.localeCompare(b.id)),
      correctOption: 'A',
      explanation: 'Lời giải chi tiết.',
    };
  }

  // In worst case, keep full block as title and provide default choices
  return {
    id,
    section: 1,
    orderNumber,
    type: 'multiple_choice',
    title: block,
    imageUrl,
    imageCaption,
    options: [
      { id: 'A', content: 'Phương án A' },
      { id: 'B', content: 'Phương án B' },
      { id: 'C', content: 'Phương án C' },
      { id: 'D', content: 'Phương án D' },
    ],
    correctOption: 'A',
    explanation: 'Lời giải chi tiết.',
  };
}

/**
 * Parses a True/False question block (Section 2).
 * Extracts statements a), b), c), d) and any diagram images
 */
function parseTrueFalseBlock(block: string, orderNumber: number, id: string): Question {
  const { imageUrl, imageCaption } = extractQuestionImages(block);

  const regex = /(?:^|[\n\r\t\s])([a-d])\s*[\).:]\s*/gi;
  const matches: Array<{ letter: string; letterIndex: number; contentStart: number }> = [];

  let m;
  while ((m = regex.exec(block)) !== null) {
    const letter = m[1].toLowerCase();
    const fullMatch = m[0];
    const letterIndex = m.index + fullMatch.toLowerCase().indexOf(letter);
    const contentStart = m.index + fullMatch.length;

    // Ignore if inside math mode
    const prefix = block.substring(0, letterIndex);
    const dollarCount = (prefix.match(/(?<!\\)\$/g) || []).length;
    if (dollarCount % 2 === 1) continue;

    matches.push({ letter, letterIndex, contentStart });
  }

  let seq: { a: typeof matches[0]; b: typeof matches[0]; c: typeof matches[0]; d: typeof matches[0] } | null = null;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].letter === 'a') {
      const a = matches[i];
      const b = matches.slice(i + 1).find((x) => x.letter === 'b' && x.letterIndex > a.letterIndex);
      if (!b) continue;
      const c = matches.slice(i + 1).find((x) => x.letter === 'c' && x.letterIndex > b.letterIndex);
      if (!c) continue;
      const d = matches.slice(i + 1).find((x) => x.letter === 'd' && x.letterIndex > c.letterIndex);
      if (!d) continue;
      seq = { a, b, c, d };
      break;
    }
  }

  let title = cleanMathArtifacts(block);
  const statements: Array<{ id: 'a' | 'b' | 'c' | 'd'; content: string; correctAnswer: boolean }> = [];
  let explanation = '';

  if (seq) {
    title = cleanMathArtifacts(block.substring(0, seq.a.letterIndex).trim());
    if (imageUrl && title.includes(imageUrl)) {
      title = title.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
    }
    const stA = cleanMathArtifacts(block.substring(seq.a.contentStart, seq.b.letterIndex).trim());
    const stB = cleanMathArtifacts(block.substring(seq.b.contentStart, seq.c.letterIndex).trim());
    const stC = cleanMathArtifacts(block.substring(seq.c.contentStart, seq.d.letterIndex).trim());
    let stD = block.substring(seq.d.contentStart).trim();

    const explMatch = /(?:Lời giải|Hướng dẫn giải|HD|Giải chi tiết)\s*[:.\-–]\s*/i.exec(stD);
    if (explMatch) {
      explanation = stD.substring(explMatch.index + explMatch[0].length).trim();
      stD = stD.substring(0, explMatch.index).trim();
    }
    stD = cleanMathArtifacts(stD);

    const parseStatementAnswer = (content: string, _letter: 'a' | 'b' | 'c' | 'd') => {
      const isSai = /\b(?:Sai|S)\b/i.test(content) || /\[S\]/i.test(content);
      return !isSai;
    };

    statements.push(
      { id: 'a', content: stA, correctAnswer: parseStatementAnswer(stA, 'a') },
      { id: 'b', content: stB, correctAnswer: parseStatementAnswer(stB, 'b') },
      { id: 'c', content: stC, correctAnswer: parseStatementAnswer(stC, 'c') },
      { id: 'd', content: stD, correctAnswer: parseStatementAnswer(stD, 'd') }
    );
  } else {
    statements.push(
      { id: 'a', content: 'Mệnh đề a', correctAnswer: true },
      { id: 'b', content: 'Mệnh đề b', correctAnswer: true },
      { id: 'c', content: 'Mệnh đề c', correctAnswer: false },
      { id: 'd', content: 'Mệnh đề d', correctAnswer: true }
    );
  }

  return {
    id,
    section: 2,
    orderNumber,
    type: 'true_false',
    title: title || `Câu hỏi ${orderNumber}`,
    imageUrl,
    imageCaption,
    statements,
    explanation: cleanMathArtifacts(explanation) || 'Xét tính đúng sai của từng mệnh đề theo kiến thức định lý.',
    difficulty: 'Vận dụng',
  };
}

/**
 * Parses a Short Answer question block (Section 3)
 */
function parseShortAnswerBlock(block: string, orderNumber: number, id: string): Question {
  const { imageUrl, imageCaption } = extractQuestionImages(block);

  let title = cleanMathArtifacts(block);
  let correctShortAnswer = '';
  let explanation = '';

  const ansMatch = /(?:Đáp số|Đáp án|ĐS|Kết quả)\s*[:.\-–]\s*([^\n\r]+)/i.exec(block);
  if (ansMatch) {
    correctShortAnswer = ansMatch[1].trim();
    title = cleanMathArtifacts(block.substring(0, ansMatch.index).trim());
    const afterAns = block.substring(ansMatch.index + ansMatch[0].length);

    const explMatch = /(?:Lời giải|Hướng dẫn giải|HD|Giải chi tiết)\s*[:.\-–]\s*/i.exec(afterAns);
    if (explMatch) {
      explanation = afterAns.substring(explMatch.index + explMatch[0].length).trim();
    }
  } else {
    const explMatch = /(?:Lời giải|Hướng dẫn giải|HD|Giải chi tiết)\s*[:.\-–]\s*/i.exec(block);
    if (explMatch) {
      explanation = block.substring(explMatch.index + explMatch[0].length).trim();
      title = cleanMathArtifacts(block.substring(0, explMatch.index).trim());
    }
  }

  if (imageUrl && title.includes(imageUrl)) {
    title = title.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
  }

  return {
    id,
    section: 3,
    orderNumber,
    type: 'short_answer',
    title: title || `Câu hỏi ${orderNumber}`,
    imageUrl,
    imageCaption,
    correctShortAnswer: correctShortAnswer || '0',
    explanation: cleanMathArtifacts(explanation) || 'Giải chi tiết để tìm ra giá trị số đáp án.',
    difficulty: 'Vận dụng cao',
  };
}

/**
 * Generic parser for documents without explicit PHẦN I, II, III headers
 */
function parseAllQuestionsGeneric(text: string): Question[] {
  const blocks = splitQuestionBlocks(text);
  const questions: Question[] = [];

  blocks.forEach((b, idx) => {
    const orderNumber = idx + 1;
    const id = `q-gen-${orderNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const content = b.content;

    const hasOptions =
      /(?:^|[\n\r\t\s])A\s*[\).:]\s*/.test(content) &&
      /(?:^|[\n\r\t\s])B\s*[\).:]\s*/.test(content);

    const hasStatements =
      /(?:^|[\n\r\t\s])a\s*[\).:]\s*/i.test(content) &&
      /(?:^|[\n\r\t\s])b\s*[\).:]\s*/i.test(content) &&
      !hasOptions;

    if (hasOptions) {
      questions.push(parseMultipleChoiceBlock(content, orderNumber, id));
    } else if (hasStatements) {
      questions.push(parseTrueFalseBlock(content, orderNumber, id));
    } else {
      questions.push(parseShortAnswerBlock(content, orderNumber, id));
    }
  });

  return questions;
}

export const REAL_MATH_EXAM_TEMPLATE_TEXT = `BỘ GIÁO DỤC VÀ ĐÀO TẠO
KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG TỪ NĂM 2025
ĐỀ THI THAM KHẢO CHUẨN CẤU TRÚC ĐỊNH DẠNG MỚI
MÔN: TOÁN HỌC
Thời gian làm bài: 90 phút (không kể thời gian phát đề)

=============================================================================
HƯỚNG DẪN ĐỊNH DẠNG ĐỀ THI:
- Đề thi gồm 03 phần:
  + PHẦN I: Trắc nghiệm 4 lựa chọn (12 câu, từ Câu 1 đến Câu 12).
  + PHẦN II: Trắc nghiệm Đúng/Sai (4 câu, từ Câu 1 đến Câu 4, mỗi câu gồm 4 ý a, b, c, d).
  + PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu, từ Câu 1 đến Câu 6).
- Công thức Toán học đặt giữa hai dấu $...$ (ví dụ: $y = x^3 - 3x^2 + 2$, $\\int f(x)dx$).
- Mỗi câu hỏi bắt đầu bằng "Câu [số]: [Nội dung]".
- Các phương án trắc nghiệm: A. [Nội dung], B. [Nội dung], C. [Nội dung], D. [Nội dung].
=============================================================================

PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.

Câu 1: Cho hàm số $y = f(x)$ có bảng biến thiên với đạo hàm $f'(x) < 0$ trên $(-1; 2)$ và $f'(x) > 0$ trên $(2; +\\infty)$. Hàm số đã cho nghịch biến trên khoảng nào dưới đây?
A. $(-1; 2)$
B. $(2; +\\infty)$
C. $(-\\infty; -1)$
D. $(0; 3)$
Lời giải: Dựa vào bảng biến thiên, ta có $f'(x) < 0$ trên khoảng $(-1; 2)$ nên hàm số nghịch biến trên khoảng $(-1; 2)$. Chọn A.

Câu 2: Họ tất cả các nguyên hàm của hàm số $f(x) = 3x^2 + 2\\sin x$ trên $\\mathbb{R}$ là:
A. $F(x) = x^3 - 2\\cos x + C$
B. $F(x) = x^3 + 2\\cos x + C$
C. $F(x) = 6x + 2\\cos x + C$
D. $F(x) = x^3 - 2\\sin x + C$
Lời giải: Ta có $\\int (3x^2 + 2\\sin x)dx = x^3 - 2\\cos x + C$. Chọn A.

Câu 3: Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = a$, $BC = a\\sqrt{3}$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy và $SA = 2a$. Thể tích của khối chóp $S.ABC$ bằng:
A. $\\frac{a^3\\sqrt{3}}{3}$
B. $a^3\\sqrt{3}$
C. $\\frac{2a^3\\sqrt{3}}{3}$
D. $2a^3\\sqrt{3}$
Lời giải: Diện tích đáy $S_{ABC} = \\frac{1}{2}AB \\cdot BC = \\frac{1}{2}a \\cdot a\\sqrt{3} = \\frac{a^2\\sqrt{3}}{2}$. Thể tích khối chóp $V = \\frac{1}{3}S_{ABC} \\cdot SA = \\frac{1}{3} \\cdot \\frac{a^2\\sqrt{3}}{2} \\cdot 2a = \\frac{a^3\\sqrt{3}}{3}$. Chọn A.

Câu 4: Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - 3y + z - 5 = 0$. Một vectơ pháp tuyến của mặt phẳng $(P)$ là:
A. $\\overrightarrow{n_1} = (2; -3; 1)$
B. $\\overrightarrow{n_2} = (2; 3; 1)$
C. $\\overrightarrow{n_3} = (2; -3; -5)$
D. $\\overrightarrow{n_4} = (-2; -3; 1)$
Lời giải: Vectơ pháp tuyến của mặt phẳng $(P)$ là $\\overrightarrow{n} = (2; -3; 1)$. Chọn A.

Câu 5: Tập nghiệm của bất phương trình $\\log_2(x - 1) < 3$ là:
A. $(1; 9)$
B. $(-\\infty; 9)$
C. $(1; 8)$
D. $(9; +\\infty)$
Lời giải: Điều kiện xác định: $x - 1 > 0 \\Leftrightarrow x > 1$. Bất phương trình tương đương $x - 1 < 2^3 = 8 \\Leftrightarrow x < 9$. Kết hợp điều kiện ta được tập nghiệm $S = (1; 9)$. Chọn A.

Câu 6: Cho hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ có đồ thị đạt cực đại tại điểm $M(-1; 4)$ và cực tiểu tại điểm $N(1; 0)$. Điểm cực đại của đồ thị hàm số đã cho là:
A. $M(-1; 4)$
B. $N(1; 0)$
C. $x = -1$
D. $y = 4$
Lời giải: Điểm cực đại của đồ thị hàm số có tọa độ là $(-1; 4)$. Chọn A.

Câu 7: Trong không gian $Oxyz$, cho hai điểm $A(1; 2; -3)$ và $B(3; 0; 1)$. Tọa độ trung điểm $M$ của đoạn thẳng $AB$ là:
A. $M(2; 1; -1)$
B. $M(4; 2; -2)$
C. $M(1; -1; 2)$
D. $M(2; 1; 2)$
Lời giải: Tọa độ trung điểm $M$ có công thức $x_M = \\frac{1+3}{2} = 2$, $y_M = \\frac{2+0}{2} = 1$, $z_M = \\frac{-3+1}{2} = -1$. Suy ra $M(2; 1; -1)$. Chọn A.

Câu 8: Đạo hàm của hàm số $y = 3^x$ trên tập $\\mathbb{R}$ là:
A. $y' = 3^x \\ln 3$
B. $y' = \\frac{3^x}{\\ln 3}$
C. $y' = x \\cdot 3^{x-1}$
D. $y' = 3^x$
Lời giải: Áp dụng công thức đạo hàm hàm số mũ $(a^x)' = a^x \\ln a$, ta có $(3^x)' = 3^x \\ln 3$. Chọn A.

Câu 9: Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 3$ và công sai $d = 4$. Giá trị của $u_3$ bằng:
A. 11
B. 15
C. 7
D. 12
Lời giải: Ta có $u_3 = u_1 + 2d = 3 + 2 \\cdot 4 = 11$. Chọn A.

Câu 10: Cho hình lập phương $ABCD.A'B'C'D'$. Góc giữa hai đường thẳng $AC$ và $A'D'$ bằng:
A. $45^\\circ$
B. $60^\\circ$
C. $90^\\circ$
D. $30^\\circ$
Lời giải: Vì $AD \\parallel A'D'$ nên $(AC, A'D') = (AC, AD) = \\widehat{CAD}$. Do $ABCD$ là hình vuông nên $\\widehat{CAD} = 45^\\circ$. Chọn A.

Câu 11: Cho số phức $z = 3 - 4i$. Môđun của số phức $z$ bằng:
A. 5
B. 7
C. $\\sqrt{7}$
D. 25
Lời giải: Ta có $|z| = \\sqrt{3^2 + (-4)^2} = \\sqrt{9 + 16} = 5$. Chọn A.

Câu 12: Một hộp có 5 viên bi đỏ và 4 viên bi xanh. Lấy ngẫu nhiên đồng thời 2 viên bi. Xác suất để lấy được 2 viên bi cùng màu là:
A. $\\frac{4}{9}$
B. $\\frac{5}{9}$
C. $\\frac{1}{2}$
D. $\\frac{2}{9}$
Lời giải: Số phần tử không gian mẫu $n(\\Omega) = C_9^2 = 36$. Số kết quả thuận lợi $n(A) = C_5^2 + C_4^2 = 10 + 6 = 16$. Xác suất $P(A) = \\frac{16}{36} = \\frac{4}{9}$. Chọn A.

PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.

Câu 1: Cho hàm số $y = f(x) = \\frac{x^2 - 3x + 3}{x - 1}$ có đồ thị là $(C)$.
a) Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$.
b) Đạo hàm của hàm số đã cho là $f'(x) = \\frac{x^2 - 2x}{(x - 1)^2}$.
c) Đồ thị $(C)$ có đường tiệm cận đứng là $x = 1$ và đường tiệm cận xiên là $y = x - 2$.
d) Hàm số đã cho đồng biến trên toàn bộ tập xác định $D$.
Lời giải:
a) Đúng. Mẫu số $x - 1 \\ne 0 \\Leftrightarrow x \\ne 1$.
b) Đúng. $f'(x) = \\frac{(2x-3)(x-1) - (x^2-3x+3)}{(x-1)^2} = \\frac{x^2 - 2x}{(x-1)^2}$.
c) Đúng. $\\lim_{x \\to 1^+} f(x) = +\\infty$ nên $x = 1$ là tiệm cận đứng; biến đổi $f(x) = x - 2 + \\frac{1}{x-1}$ suy ra $y = x - 2$ là tiệm cận xiên.
d) Sai. Hàm số chỉ đồng biến trên các khoảng $(-\\infty; 0)$ và $(2; +\\infty)$, nghịch biến trên $(0; 1)$ và $(1; 2)$.

Câu 2: Trong không gian $Oxyz$, cho ba điểm $A(1; 0; 0)$, $B(0; 2; 0)$, $C(0; 0; 3)$ và mặt phẳng $(P): 2x + 2y - z + 4 = 0$.
a) Phương trình mặt phẳng $(ABC)$ là $\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1$.
b) Một vectơ pháp tuyến của mặt phẳng $(P)$ là $\\overrightarrow{n_P} = (2; 2; -1)$.
c) Khoảng cách từ gốc tọa độ $O$ đến mặt phẳng $(P)$ bằng $\\frac{4}{3}$.
d) Mặt phẳng $(P)$ vuông góc với mặt phẳng $(ABC)$.
Lời giải:
a) Đúng. Phương trình đoạn chắn qua ba điểm trên các trục tọa độ.
b) Đúng. Hệ số trước $x, y, z$ trong phương trình $(P)$.
c) Đúng. $d(O, P) = \\frac{|4|}{\\sqrt{2^2 + 2^2 + (-1)^2}} = \\frac{4}{3}$.
d) Sai. $\\overrightarrow{n_{ABC}} = (6; 3; 2)$ và $\\overrightarrow{n_P} = (2; 2; -1) \\Rightarrow \\overrightarrow{n_{ABC}} \\cdot \\overrightarrow{n_P} = 12 + 6 - 2 = 16 \\ne 0$.

Câu 3: Một doanh nghiệp sản xuất một loại sản phẩm với hàm tổng chi phí $C(x) = x^3 - 30x^2 + 500x + 1000$ (triệu đồng), trong đó $x$ là số lượng sản phẩm ($0 < x \\le 30$).
a) Chi phí cố định ban đầu của doanh nghiệp là 1000 triệu đồng.
b) Chi phí biên tại mức sản lượng $x = 10$ là 200 triệu đồng/sản phẩm.
c) Chi phí biên nhỏ nhất khi doanh nghiệp sản xuất 10 sản phẩm.
d) Chi phí trung bình cho mỗi sản phẩm đạt giá trị nhỏ nhất khi sản xuất 20 sản phẩm.
Lời giải:
a) Đúng. Chi phí cố định là $C(0) = 1000$ triệu đồng.
b) Đúng. Chi phí biên $C'(x) = 3x^2 - 60x + 500 \\Rightarrow C'(10) = 3(100) - 600 + 500 = 200$.
c) Đúng. $C''(x) = 6x - 60 = 0 \\Leftrightarrow x = 10$.
d) Sai. Chi phí trung bình $\\bar{C}(x) = x^2 - 30x + 500 + \\frac{1000}{x}$, có đạo hàm $\\bar{C}'(x) = 2x - 30 - \\frac{1000}{x^2} \\ne 0$ tại $x = 20$.

Câu 4: Một nhóm học sinh gồm 6 nam và 4 nữ tham gia cuộc thi khoa học. Ban tổ chức chọn ngẫu nhiên 3 bạn vào đội thuyết trình.
a) Số cách chọn ngẫu nhiên 3 học sinh bất kỳ là 120 cách.
b) Xác suất để cả 3 bạn được chọn đều là nữ là $\\frac{1}{30}$.
c) Xác suất để đội thuyết trình có đúng 2 bạn nam là $\\frac{1}{2}$.
d) Xác suất để đội thuyết trình có ít nhất 1 bạn nữ là $\\frac{5}{6}$.
Lời giải:
a) Đúng. $C_{10}^3 = 120$.
b) Đúng. Xác suất $P = \\frac{C_4^3}{120} = \\frac{4}{120} = \\frac{1}{30}$.
c) Đúng. Số cách chọn 2 nam và 1 nữ là $C_6^2 \\cdot C_4^1 = 15 \\cdot 4 = 60 \\Rightarrow P = \\frac{60}{120} = \\frac{1}{2}$.
d) Đúng. Xác suất chọn 3 nam là $\\frac{C_6^3}{120} = \\frac{20}{120} = \\frac{1}{6}$. Do đó xác suất có ít nhất 1 nữ là $1 - \\frac{1}{6} = \\frac{5}{6}$.

PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN
Thí sinh trả lời từ câu 1 đến câu 6.

Câu 1: Một vật chuyển động thẳng xác định bởi phương trình quãng đường $s(t) = -t^3 + 9t^2 + 21t$ (với $t$ tính bằng giây, $s$ tính bằng mét). Vận tốc tức thời cực đại của vật đạt được bằng bao nhiêu mét trên giây (m/s)?
Đáp số: 48
Lời giải: Vận tốc tức thời $v(t) = s'(t) = -3t^2 + 18t + 21$. Đạo hàm $v'(t) = -6t + 18 = 0 \\Leftrightarrow t = 3$. Khi đó vận tốc cực đại là $v(3) = -3(9) + 18(3) + 21 = 48$ m/s.

Câu 2: Cho khối chóp tứ giác đều $S.ABCD$ có cạnh đáy bằng 4 cm và chiều cao bằng 6 cm. Thể tích của khối chóp $S.ABCD$ bằng bao nhiêu xăng-ti-mét khối ($\\text{cm}^3$)?
Đáp số: 32
Lời giải: Diện tích đáy $S_{ABCD} = 4^2 = 16 \\text{ cm}^2$. Thể tích $V = \\frac{1}{3} \\cdot S_{ABCD} \\cdot h = \\frac{1}{3} \\cdot 16 \\cdot 6 = 32 \\text{ cm}^3$.

Câu 3: Trong không gian $Oxyz$, cho điểm $M(2; -1; 3)$ và mặt phẳng $(P): 2x - 2y + z + 1 = 0$. Khoảng cách từ điểm $M$ đến mặt phẳng $(P)$ bằng bao nhiêu?
Đáp số: 3.33
Lời giải: Khoảng cách $d(M, P) = \\frac{|2(2) - 2(-1) + 3 + 1|}{\\sqrt{2^2 + (-2)^2 + 1^2}} = \\frac{|4 + 2 + 3 + 1|}{\\sqrt{9}} = \\frac{10}{3} \\approx 3.33$.

Câu 4: Có bao nhiêu giá trị nguyên của tham số $m \\in [-10; 10]$ để hàm số $y = \\frac{x + 2}{x - m}$ đồng biến trên khoảng $(3; +\\infty)$?
Đáp số: 8
Lời giải: Tập xác định $D = \\mathbb{R} \\setminus \\{m\\}$. Ta có $y' = \\frac{-m - 2}{(x - m)^2}$. Hàm số đồng biến trên $(3; +\\infty) \\Leftrightarrow y' > 0$ và $m \\notin (3; +\\infty) \\Leftrightarrow -m - 2 > 0$ và $m \\le 3 \\Leftrightarrow m < -2$ và $m \\le 3 \\Leftrightarrow m \\le -3$. Vì $m \\in [-10; 10]$ và $m \\in \\mathbb{Z}$ nên $m \\in \\{-10, -9, -8, -7, -6, -5, -4, -3\\}$, có 8 giá trị nguyên thỏa mãn.

Câu 5: Một người gửi 200 triệu đồng vào ngân hàng với lãi suất kép 6,5%/năm. Biết rằng lãi suất không đổi trong suốt thời gian gửi. Hỏi sau ít nhất bao nhiêu năm người đó thu được tổng số tiền cả gốc lẫn lãi vượt quá 350 triệu đồng?
Đáp số: 9
Lời giải: Ta có $200 \\cdot (1 + 0.065)^n > 350 \\Leftrightarrow (1.065)^n > 1.75 \\Leftrightarrow n > \\log_{1.065}(1.75) \\approx 8.88$. Do số năm là số nguyên nên cần ít nhất 9 năm.

Câu 6: Một trang trại nuôi cá thí nghiệm nhận thấy tốc độ tăng đàn cá sau $t$ ngày tuân theo quy luật $N'(t) = 150\\sqrt{t}$ (con/ngày). Biết tại thời điểm ban đầu $t = 0$ có 1000 con cá. Hỏi sau 4 ngày thí nghiệm, trang trại có bao nhiêu con cá?
Đáp số: 1800
Lời giải: Số lượng cá sau 4 ngày là $N(4) = N(0) + \\int_0^4 150\\sqrt{t} dt = 1000 + 150 \\cdot [\\frac{2}{3}t^{3/2}]_0^4 = 1000 + 100 \\cdot (4^{3/2}) = 1000 + 100 \\cdot 8 = 1800$ con.
`;

function escapeXmlForDocx(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDocumentXmlContent(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const paragraphXmls: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:spacing w:line="240" w:lineRule="auto" w:after="80"/>
          </w:pPr>
        </w:p>
      `);
      continue;
    }

    if (line.startsWith('===') || line.startsWith('---')) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:spacing w:before="120" w:after="120"/>
            <w:pBdr>
              <w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/>
            </w:pBdr>
          </w:pPr>
        </w:p>
      `);
      continue;
    }

    if (
      line.includes('BỘ GIÁO DỤC') ||
      line.includes('KỲ THI TỐT NGHIỆP') ||
      line.includes('ĐỀ THI THAM KHẢO') ||
      line.includes('MÔN: TOÁN') ||
      line.includes('Thời gian làm bài')
    ) {
      const isBold = !line.includes('Thời gian');
      const sz = line.includes('ĐỀ THI') || line.includes('MÔN:') ? '28' : '24';
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>
            <w:spacing w:line="260" w:lineRule="auto" w:after="60"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              ${isBold ? '<w:b/>' : ''}
              <w:sz w:val="${sz}"/>
              <w:color w:val="0F172A"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    if (/^PHẦN\s+(I|II|III)\b/i.test(line)) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:spacing w:before="260" w:after="100"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:sz w:val="26"/>
              <w:color w:val="1E3A8A"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    const qMatch = line.match(/^(Câu\s+\d+[\s:.\-–]+)(.*)$/i);
    if (qMatch) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:spacing w:before="140" w:after="60"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:color w:val="0F172A"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(qMatch[1])}</w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(qMatch[2])}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    const optMatch = line.match(/^([A-D]\.|\b[a-d]\))\s*(.*)$/);
    if (optMatch) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:ind w:left="400"/>
            <w:spacing w:line="240" w:lineRule="auto" w:after="40"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(optMatch[1])} </w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(optMatch[2])}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    if (/^(Lời giải|Đáp số|Đáp án):/i.test(line)) {
      paragraphXmls.push(`
        <w:p>
          <w:pPr>
            <w:ind w:left="400"/>
            <w:spacing w:before="60" w:after="140"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:i/>
              <w:color w:val="047857"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXmlForDocx(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    paragraphXmls.push(`
      <w:p>
        <w:pPr>
          <w:spacing w:line="240" w:lineRule="auto" w:after="60"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXmlForDocx(line)}</w:t>
        </w:r>
      </w:p>
    `);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphXmls.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

/**
 * Builds a valid, authentic Office OpenXML .docx Blob using JSZip.
 * Compatible with Microsoft Word, Google Docs, LibreOffice, WPS, and mammoth.
 */
export async function buildDocxBlobFromText(rawText: string): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // 4. word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:after="100"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // 5. word/document.xml
  const docXml = buildDocumentXmlContent(rawText);
  zip.file('word/document.xml', docXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Generates and triggers download of a standardized, authentic .docx template.
 */
export async function downloadDocxTemplate(subjectName: string = 'Toán học') {
  let content = REAL_MATH_EXAM_TEMPLATE_TEXT;
  let filename = `De_Thi_Mau_Toan_Chuan_Cau_Truc_2026.docx`;

  if (subjectName !== 'Toán học') {
    content = `=============================================================================
BỘ GIÁO DỤC VÀ ĐÀO TẠO - ĐỀ KIỂM TRA CHUẨN ĐỊNH DẠNG MỚI
MÔN: ${subjectName.toUpperCase()} - NĂM HỌC 2025 - 2026
HƯỚNG DẪN SOẠN ĐỀ:
1. Mỗi câu bắt đầu bằng "Câu [số]: [Nội dung]".
2. Công thức Khoa học đặt trong dấu $...$ (inline) hoặc $$...$$ (block).
3. Các phương án trắc nghiệm ghi rõ: A. [Nội dung], B. [Nội dung], C. [Nội dung], D. [Nội dung].
4. Đánh dấu đáp án đúng bằng chữ in hoa hoặc mục Lời giải.
=============================================================================

PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.

Câu 1: Câu hỏi trắc nghiệm minh họa môn ${subjectName} 01. Nội dung câu hỏi và các phương án lựa chọn:
A. Phương án A
B. Phương án B
C. Phương án C
D. Phương án D
Lời giải: Hướng dẫn giải chi tiết. Chọn A.

Câu 2: Câu hỏi trắc nghiệm minh họa môn ${subjectName} 02:
A. Lựa chọn 1
B. Lựa chọn 2
C. Lựa chọn 3
D. Lựa chọn 4
Lời giải: Hướng dẫn giải chi tiết. Chọn B.

PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.

Câu 3: Đọc đoạn thông tin hoặc dữ liệu thực nghiệm sau đây và chọn Đúng hoặc Sai cho mỗi ý:
a) Nhận định ý a là chính xác theo lý thuyết.
b) Nhận định ý b có sai số trong quá trình đo đạc.
c) Nhận định ý c phù hợp với quy luật tự nhiên.
d) Kết luận ý d là suy luận hợp lý.
Lời giải:
a) Đúng.
b) Đúng.
c) Đúng.
d) Sai.

PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN
Thí sinh trả lời từ câu 1 đến câu 6.

Câu 4: Tính giá trị định lượng theo yêu cầu của bài toán (ghi kết quả dưới dạng số nguyên hoặc số thập phân):
Đáp số: 25
Lời giải: Chi tiết các bước tính toán dẫn đến kết quả 25.
`;
    filename = `Mau_De_Thi_${subjectName.replace(/\s+/g, '_')}_2026.docx`;
  }

  try {
    const blob = await buildDocxBlobFromText(content);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error generating docx file via JSZip:', err);
    // Fallback: download the static file if available
    const a = document.createElement('a');
    a.href = '/templates/de_thi_mau_toan_chuan_cau_truc_2026.docx';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

