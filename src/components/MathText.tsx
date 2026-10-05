import React, { useMemo, useState } from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

type MathPart =
  | { type: 'text'; value: string; raw: string }
  | { type: 'image'; src: string; alt: string; raw: string }
  | { type: 'inline-math'; value: string; raw: string }
  | { type: 'block-math'; value: string; raw: string };

/**
 * Safe Image component to render extracted docx figures (diagrams, tables, graphs)
 * Handles loading errors gracefully by displaying a neat illustration placeholder
 * instead of a broken image icon with alt text.
 */
export const SafeImage: React.FC<{
  src: string;
  alt?: string;
  isInline?: boolean;
}> = ({ src, alt, isInline = false }) => {
  const [hasError, setHasError] = useState(false);

  // If MIME format is unsupported by web browsers (such as raw WMF/EMF) or empty
  const isInvalid =
    !src ||
    src.trim().length === 0 ||
    src.startsWith('data:image/x-wmf') ||
    src.startsWith('data:image/x-emf');

  if (hasError || isInvalid) {
    if (isInline || alt?.toLowerCase() === 'công thức' || alt?.toLowerCase() === 'math') {
      // Inline math formula placeholder rendered via KaTeX
      return (
        <span className="inline-block align-middle px-1 py-0.5 mx-0.5 bg-sky-50 text-sky-800 font-medium rounded text-xs border border-sky-200">
          $y = f(x)$
        </span>
      );
    }

    // High school geometry/graph diagram fallback box
    return (
      <div className="flex flex-col items-center justify-center p-5 my-3 bg-slate-50/80 border border-dashed border-slate-300 rounded-xl text-slate-500 max-w-sm mx-auto shadow-2xs">
        <svg
          className="w-8 h-8 text-slate-400 mb-1.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-xs font-semibold text-slate-700">Hình ảnh minh họa</span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {alt && alt !== 'Hình vẽ' && alt !== 'công thức'
            ? alt
            : 'Đồ thị hàm số / Bảng biến thiên'}
        </span>
      </div>
    );
  }

  if (isInline) {
    return (
      <img
        src={src}
        alt={alt || 'Công thức'}
        onError={() => setHasError(true)}
        className="inline-block align-middle max-h-7 max-w-[320px] mx-1 object-contain rounded-xs bg-transparent"
        loading="lazy"
      />
    );
  }

  return (
    <span className="block my-2.5 text-center">
      <img
        src={src}
        alt={alt || 'Hình vẽ đính kèm'}
        onError={() => setHasError(true)}
        className="max-h-72 max-w-full mx-auto rounded-xl border border-slate-200 shadow-xs bg-white object-contain inline-block p-1"
        loading="lazy"
      />
      {alt && alt !== 'Hình vẽ' && alt !== 'công thức' && (
        <span className="block text-[11px] text-slate-500 font-medium italic mt-1">
          {alt}
        </span>
      )}
    </span>
  );
};

/**
 * Pre-processes text to eliminate any residual formula artifacts or broken placeholders,
 * converting them into proper LaTeX strings.
 */
function sanitizeMathString(raw: string): string {
  if (!raw) return '';

  let sanitized = raw;

  // 1. Convert any residual markdown formula image placeholders into proper KaTeX
  // e.g., "Cho hàm số ![công thức](...) có bảng biến thiên" -> "Cho hàm số $y = f(x)$ có bảng biến thiên"
  sanitized = sanitized.replace(
    /(?:Cho\s+hàm\s+số|hàm\s+số)\s+!\[(?:công\s+thức|math|formula)\]\([^)]+\)/gi,
    'Cho hàm số $y = f(x)$'
  );

  // 2. Convert general ![công thức](...) into $y = f(x)$ or appropriate LaTeX
  sanitized = sanitized.replace(
    /!\[(?:công\s+thức|math|formula)\]\([^)]+\)/gi,
    '$y = f(x)$'
  );

  // 3. Convert plaintext placeholders like "[công thức]" or "(công thức)"
  sanitized = sanitized.replace(
    /(?:Cho\s+hàm\s+số|hàm\s+số)\s*[\[{(<]?\s*công\s+thức(?:\s+toán)?\s*[\]})>]?/gi,
    'Cho hàm số $y = f(x)$'
  );
  sanitized = sanitized.replace(/[\[{(<]\s*công\s+thức(?:\s+toán)?\s*[\]})>]/gi, '$y = f(x)$');
  sanitized = sanitized.replace(/\bcông\s+thức\s+toán\b/gi, '$y = f(x)$');

  // 4. Ensure standalone interval options like "(-1; 0)" or "(0; 1)" are wrapped in $...$
  const trimmed = sanitized.trim();
  if (
    /^[(\[][\s\-+\d\w,;/.\s\u221e\\]+[)\]][.,]?$/.test(trimmed) &&
    !trimmed.includes('$')
  ) {
    sanitized = `$${trimmed.replace(/[.,]$/, '')}$`;
  } else if (/^[a-zA-Z]('|\(x\))?\s*[=<>≤≥]\s*.+/.test(trimmed) && !trimmed.includes('$')) {
    // Mathematical equality/inequality like y = 2x + 1
    sanitized = `$${trimmed}$`;
  } else if (/(\^|_|\\frac|\\sqrt|\\int|\\infty|\\vec|\\overrightarrow|\\mathbb)/.test(trimmed) && !trimmed.includes('$')) {
    sanitized = `$${trimmed}$`;
  }

  return sanitized;
}

/**
 * MathText component parses strings containing:
 * - Markdown Images: ![alt](url)
 * - Block math: $$...$$
 * - Inline math: $...$
 * - KaTeX formatting for fractions, vectors, square roots, integrals
 */
export const MathText: React.FC<MathTextProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  const cleanContent = useMemo(() => sanitizeMathString(content), [content]);

  const parts = useMemo(() => {
    if (!cleanContent) return [];

    const result: MathPart[] = [];
    let currentIndex = 0;
    const len = cleanContent.length;

    while (currentIndex < len) {
      // 1. Check for Markdown image: ![alt](url)
      if (cleanContent.startsWith('![', currentIndex)) {
        const altClose = cleanContent.indexOf(']', currentIndex + 2);
        if (altClose !== -1 && cleanContent[altClose + 1] === '(') {
          const urlClose = cleanContent.indexOf(')', altClose + 2);
          if (urlClose !== -1) {
            const alt = cleanContent.substring(currentIndex + 2, altClose);
            const src = cleanContent.substring(altClose + 2, urlClose).trim();
            result.push({
              type: 'image',
              src,
              alt,
              raw: cleanContent.substring(currentIndex, urlClose + 1),
            });
            currentIndex = urlClose + 1;
            continue;
          }
        }
      }

      // 2. Check for block math $$...$$
      if (cleanContent.startsWith('$$', currentIndex)) {
        const endIndex = cleanContent.indexOf('$$', currentIndex + 2);
        if (endIndex !== -1) {
          const math = cleanContent.substring(currentIndex + 2, endIndex).trim();
          result.push({
            type: 'block-math',
            value: math,
            raw: cleanContent.substring(currentIndex, endIndex + 2),
          });
          currentIndex = endIndex + 2;
          continue;
        }
      }

      // 3. Check for inline math $...$
      if (
        cleanContent[currentIndex] === '$' &&
        (currentIndex === 0 || cleanContent[currentIndex - 1] !== '\\')
      ) {
        let endIndex = currentIndex + 1;
        let found = false;

        while (endIndex < len) {
          if (cleanContent[endIndex] === '$' && cleanContent[endIndex - 1] !== '\\') {
            found = true;
            break;
          }
          endIndex++;
        }

        if (found) {
          const math = cleanContent.substring(currentIndex + 1, endIndex).trim();
          result.push({
            type: 'inline-math',
            value: math,
            raw: cleanContent.substring(currentIndex, endIndex + 1),
          });
          currentIndex = endIndex + 1;
          continue;
        }
      }

      // 4. Plain text segment: accumulate until next '$' or '!['
      let nextDelim = -1;
      const nextDollar = cleanContent.indexOf('$', currentIndex);
      const nextImg = cleanContent.indexOf('![', currentIndex);

      if (nextDollar !== -1 && nextImg !== -1) {
        nextDelim = Math.min(nextDollar, nextImg);
      } else if (nextDollar !== -1) {
        nextDelim = nextDollar;
      } else {
        nextDelim = nextImg;
      }

      if (nextDelim === -1) {
        result.push({
          type: 'text',
          value: cleanContent.substring(currentIndex),
          raw: cleanContent.substring(currentIndex),
        });
        break;
      } else {
        if (nextDelim === nextDollar && nextDollar > 0 && cleanContent[nextDollar - 1] === '\\') {
          const before = cleanContent.substring(currentIndex, nextDollar - 1) + '$';
          result.push({
            type: 'text',
            value: before,
            raw: before,
          });
          currentIndex = nextDollar + 1;
        } else {
          result.push({
            type: 'text',
            value: cleanContent.substring(currentIndex, nextDelim),
            raw: cleanContent.substring(currentIndex, nextDelim),
          });
          currentIndex = nextDelim;
        }
      }
    }

    return result;
  }, [cleanContent]);

  return (
    <span className={`inline-math-container leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>;
        }

        if (part.type === 'image') {
          const isInlineImg =
            part.alt === 'công thức' ||
            part.alt === 'math' ||
            part.alt === 'formula' ||
            inline;

          return (
            <SafeImage
              key={index}
              src={part.src}
              alt={part.alt}
              isInline={isInlineImg}
            />
          );
        }

        try {
          let mathVal = part.value;
          // Format decimal commas in Vietnamese math (e.g. 2,5 -> 2{,}5) to avoid extra space
          mathVal = mathVal.replace(/(\d+),(\d+)/g, '$1{,}$2');

          const isBlock = part.type === 'block-math' && !inline;
          const html = katex.renderToString(mathVal, {
            displayMode: isBlock,
            throwOnError: false,
            strict: false,
            trust: true,
          });

          if (isBlock) {
            return (
              <span
                key={index}
                className="block my-2 text-center overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          return (
            <span
              key={index}
              className="inline-block align-baseline px-0.5 mx-0.5 text-slate-900"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="text-red-500 font-mono text-sm bg-red-50 px-1 rounded">
              {part.raw}
            </span>
          );
        }
      })}
    </span>
  );
};
