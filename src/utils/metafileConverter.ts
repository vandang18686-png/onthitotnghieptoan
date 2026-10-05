/**
 * metafileConverter.ts
 * Converts WMF and EMF image buffers from .docx files into standard PNG / JPEG / BMP data URLs
 * that can be rendered directly in web browsers.
 */

import * as wmf from 'wmf';

/**
 * Converts an ArrayBuffer of WMF or EMF into a web-safe Data URL (PNG/JPEG/BMP)
 */
export function convertMetafileToDataUrl(buffer: ArrayBuffer, ext: string): string | null {
  try {
    const uint8 = new Uint8Array(buffer);
    if (uint8.length < 16) return null;

    // 1. Check if the buffer is actually already a JPEG or PNG (sometimes Word mislabels them)
    if (uint8[0] === 0xff && uint8[1] === 0xd8) {
      return `data:image/jpeg;base64,${uint8ToBase64(uint8)}`;
    }
    if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
      return `data:image/png;base64,${uint8ToBase64(uint8)}`;
    }

    // 2. Check for EMF header (starts with record type 1 = EMR_HEADER, signature " EMF" at offset 40)
    const isEmf = isEmfBuffer(uint8);

    if (isEmf || ext.toLowerCase() === 'emf') {
      const emfResult = convertEmfToDataUrl(uint8);
      if (emfResult) return emfResult;
    }

    // 3. WMF conversion via wmf package
    if (ext.toLowerCase() === 'wmf' || !isEmf) {
      const wmfResult = convertWmfToDataUrl(uint8);
      if (wmfResult) return wmfResult;
    }
  } catch (err) {
    console.warn('convertMetafileToDataUrl error:', err);
  }

  return null;
}

function isEmfBuffer(uint8: Uint8Array): boolean {
  if (uint8.length < 44) return false;
  const dv = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
  const recType = dv.getUint32(0, true);
  if (recType !== 1) return false; // EMR_HEADER = 1
  const sig = dv.getUint32(40, true);
  return sig === 0x28434d45; // " EMF"
}

/**
 * Converts WMF buffer into PNG data URL using canvas
 */
function convertWmfToDataUrl(uint8: Uint8Array): string | null {
  if (typeof document === 'undefined') return null;

  try {
    let w = 400;
    let h = 300;
    try {
      const size = wmf.image_size(uint8);
      if (size && size[0] > 0 && size[1] > 0) {
        w = size[0];
        h = size[1];
      }
    } catch {}

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(Math.min(w * 2, 2400), 40);
    canvas.height = Math.max(Math.min(h * 2, 1800), 40);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill white background to avoid transparent dark artifacts
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);

    wmf.draw_canvas(uint8, canvas);
    const pngUrl = canvas.toDataURL('image/png');
    if (pngUrl && pngUrl.length > 200) {
      return pngUrl;
    }
  } catch (e) {
    console.warn('WMF canvas conversion failed:', e);
  }

  return null;
}

/**
 * Parses EMF records to extract embedded DIB / JPEG / PNG bitmaps or render vector paths
 */
function convertEmfToDataUrl(uint8: Uint8Array): string | null {
  if (uint8.length < 88) return null;

  try {
    const dv = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    let offset = 0;
    const len = uint8.length;

    // First record: EMR_HEADER
    const headerType = dv.getUint32(offset, true);
    if (headerType !== 1) return null;
    const headerSize = dv.getUint32(offset + 4, true);

    // Bounds in device units
    const bLeft = dv.getInt32(offset + 8, true);
    const bTop = dv.getInt32(offset + 12, true);
    const bRight = dv.getInt32(offset + 16, true);
    const bBottom = dv.getInt32(offset + 20, true);

    const emfWidth = Math.max(Math.abs(bRight - bLeft), 200);
    const emfHeight = Math.max(Math.abs(bBottom - bTop), 150);

    offset += headerSize;

    // Vector state for fallback rendering
    interface PathOp {
      type: 'move' | 'line' | 'rect' | 'ellipse' | 'polygon';
      points: Array<{ x: number; y: number }>;
    }
    const pathOps: PathOp[] = [];
    let currentX = 0;
    let currentY = 0;

    while (offset + 8 <= len) {
      const recType = dv.getUint32(offset, true);
      const recSize = dv.getUint32(offset + 4, true);
      if (recSize < 8 || offset + recSize > len) break;

      // EMR_STRETCHDIBITS = 81
      if (recType === 81) {
        const offBmiSrc = dv.getUint32(offset + 48, true);
        const cbBmiSrc = dv.getUint32(offset + 52, true);
        const offBitsSrc = dv.getUint32(offset + 56, true);
        const cbBitsSrc = dv.getUint32(offset + 60, true);

        if (cbBitsSrc > 0 && offBitsSrc > 0 && offset + offBitsSrc + cbBitsSrc <= len) {
          const bitsStart = offset + offBitsSrc;
          const bits = uint8.subarray(bitsStart, bitsStart + cbBitsSrc);

          // Check if embedded bits are directly JPEG or PNG
          if (bits[0] === 0xff && bits[1] === 0xd8) {
            return `data:image/jpeg;base64,${uint8ToBase64(bits)}`;
          }
          if (bits[0] === 0x89 && bits[1] === 0x50 && bits[2] === 0x4e && bits[3] === 0x47) {
            return `data:image/png;base64,${uint8ToBase64(bits)}`;
          }

          // Embedded DIB bitmap
          if (cbBmiSrc >= 40 && offBmiSrc > 0 && offset + offBmiSrc + cbBmiSrc <= len) {
            const bmiStart = offset + offBmiSrc;
            const bmi = uint8.subarray(bmiStart, bmiStart + cbBmiSrc);
            const bmpUrl = createBmpDataUrl(bmi, bits);
            if (bmpUrl) return bmpUrl;
          }
        }
      }

      // EMR_BITBLT = 76 or EMR_STRETCHBLT = 77
      if (recType === 76 || recType === 77) {
        const offBmiOffset = recType === 76 ? 40 : 48;
        const cbBmiOffset = recType === 76 ? 44 : 52;
        const offBitsOffset = recType === 76 ? 48 : 56;
        const cbBitsOffset = recType === 76 ? 52 : 60;

        if (offset + cbBitsOffset + 4 <= len) {
          const offBmi = dv.getUint32(offset + offBmiOffset, true);
          const cbBmi = dv.getUint32(offset + cbBmiOffset, true);
          const offBits = dv.getUint32(offset + offBitsOffset, true);
          const cbBits = dv.getUint32(offset + cbBitsOffset, true);

          if (cbBits > 0 && offBits > 0 && offset + offBits + cbBits <= len) {
            const bitsStart = offset + offBits;
            const bits = uint8.subarray(bitsStart, bitsStart + cbBits);
            if (bits[0] === 0xff && bits[1] === 0xd8) {
              return `data:image/jpeg;base64,${uint8ToBase64(bits)}`;
            }
            if (bits[0] === 0x89 && bits[1] === 0x50 && bits[2] === 0x4e && bits[3] === 0x47) {
              return `data:image/png;base64,${uint8ToBase64(bits)}`;
            }
            if (cbBmi >= 40 && offBmi > 0 && offset + offBmi + cbBmi <= len) {
              const bmiStart = offset + offBmi;
              const bmi = uint8.subarray(bmiStart, bmiStart + cbBmi);
              const bmpUrl = createBmpDataUrl(bmi, bits);
              if (bmpUrl) return bmpUrl;
            }
          }
        }
      }

      // EMR_MOVETOEX = 27
      if (recType === 27) {
        currentX = dv.getInt32(offset + 8, true);
        currentY = dv.getInt32(offset + 12, true);
        pathOps.push({ type: 'move', points: [{ x: currentX, y: currentY }] });
      }

      // EMR_LINETO = 54
      if (recType === 54) {
        const x = dv.getInt32(offset + 8, true);
        const y = dv.getInt32(offset + 12, true);
        pathOps.push({ type: 'line', points: [{ x, y }] });
        currentX = x;
        currentY = y;
      }

      // EMR_POLYGON16 = 86 or EMR_POLYLINE16 = 87
      if (recType === 86 || recType === 87) {
        const count = dv.getUint32(offset + 24, true);
        if (count > 0 && offset + 28 + count * 4 <= offset + recSize) {
          const pts: Array<{ x: number; y: number }> = [];
          for (let p = 0; p < count; p++) {
            const px = dv.getInt16(offset + 28 + p * 4, true);
            const py = dv.getInt16(offset + 30 + p * 4, true);
            pts.push({ x: px, y: py });
          }
          pathOps.push({ type: recType === 86 ? 'polygon' : 'line', points: pts });
        }
      }

      // EMR_EOF = 14
      if (recType === 14) break;

      offset += recSize;
    }

    // If vector path operations were found, render to canvas
    if (pathOps.length > 0 && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const w = Math.min(Math.max(emfWidth, 300), 1200);
      const h = Math.min(Math.max(emfHeight, 200), 900);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (const op of pathOps) {
          if (op.type === 'move' && op.points.length > 0) {
            ctx.moveTo(op.points[0].x - bLeft, op.points[0].y - bTop);
          } else if (op.type === 'line' && op.points.length > 0) {
            ctx.lineTo(op.points[0].x - bLeft, op.points[0].y - bTop);
          } else if (op.type === 'polygon' && op.points.length > 0) {
            ctx.moveTo(op.points[0].x - bLeft, op.points[0].y - bTop);
            for (let i = 1; i < op.points.length; i++) {
              ctx.lineTo(op.points[i].x - bLeft, op.points[i].y - bTop);
            }
            ctx.closePath();
          }
        }
        ctx.stroke();
        return canvas.toDataURL('image/png');
      }
    }
  } catch (err) {
    console.warn('EMF parse error:', err);
  }

  return null;
}

/**
 * Creates a BMP data URL from a BITMAPINFO structure and pixel bits
 */
function createBmpDataUrl(bmi: Uint8Array, bits: Uint8Array): string | null {
  try {
    const fileHeaderSize = 14;
    const totalSize = fileHeaderSize + bmi.length + bits.length;

    const fileHeader = new Uint8Array(fileHeaderSize);
    const dv = new DataView(fileHeader.buffer);

    // "BM" signature
    fileHeader[0] = 0x42;
    fileHeader[1] = 0x4d;

    // Total file size
    dv.setUint32(2, totalSize, true);
    // Reserved
    dv.setUint32(6, 0, true);
    // Offset to pixel bits
    dv.setUint32(10, fileHeaderSize + bmi.length, true);

    const fullBmp = new Uint8Array(totalSize);
    fullBmp.set(fileHeader, 0);
    fullBmp.set(bmi, fileHeaderSize);
    fullBmp.set(bits, fileHeaderSize + bmi.length);

    return `data:image/bmp;base64,${uint8ToBase64(fullBmp)}`;
  } catch {
    return null;
  }
}

/**
 * Fast helper to encode Uint8Array to base64
 */
function uint8ToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
