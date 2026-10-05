/**
 * High-quality SVG diagram assets for Vietnamese High School Math Exams (TNTHPT)
 * Vector-sharp on all screen densities and retina displays.
 */

export const VARIATION_TABLE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 180" width="100%" height="180" style="background:#ffffff; font-family: 'Times New Roman', serif;">
  <style>
    .txt-label { font-size: 16px; font-style: italic; text-anchor: middle; fill: #1e293b; }
    .txt-val { font-size: 15px; font-weight: 500; text-anchor: middle; fill: #0f172a; }
    .grid-line { stroke: #334155; stroke-width: 1.2; }
    .arrow-line { stroke: #0284c7; stroke-width: 1.8; marker-end: url(#arrow); fill: none; }
  </style>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7"/>
    </marker>
  </defs>

  <!-- Border box -->
  <rect x="15" y="15" width="510" height="150" fill="#ffffff" stroke="#334155" stroke-width="1.2" rx="4"/>

  <!-- Vertical separator after variable names -->
  <line x1="85" y1="15" x2="85" y2="165" class="grid-line" />

  <!-- Horizontal rows -->
  <line x1="15" y1="52" x2="525" y2="52" class="grid-line" />
  <line x1="15" y1="88" x2="525" y2="88" class="grid-line" />

  <!-- Row 1: x values -->
  <text x="50" y="39" class="txt-label">x</text>
  <text x="125" y="38" class="txt-val">−∞</text>
  <text x="205" y="38" class="txt-val">−1</text>
  <text x="285" y="38" class="txt-val">0</text>
  <text x="365" y="38" class="txt-val">1</text>
  <text x="455" y="38" class="txt-val">+∞</text>

  <!-- Row 2: f'(x) signs -->
  <text x="50" y="74" class="txt-label">f '(x)</text>
  <text x="165" y="74" class="txt-val">−</text>
  <text x="205" y="74" class="txt-val">0</text>
  <text x="245" y="74" class="txt-val">+</text>
  <text x="285" y="74" class="txt-val">0</text>
  <text x="325" y="74" class="txt-val">−</text>
  <text x="365" y="74" class="txt-val">0</text>
  <text x="410" y="74" class="txt-val">+</text>

  <!-- Row 3: f(x) arrows and values -->
  <text x="50" y="132" class="txt-label">f(x)</text>

  <!-- Values in f(x) row -->
  <text x="125" y="108" class="txt-val">+∞</text>
  <text x="205" y="156" class="txt-val">−2</text>
  <text x="285" y="112" class="txt-val">0</text>
  <text x="365" y="156" class="txt-val">−2</text>
  <text x="455" y="108" class="txt-val">+∞</text>

  <!-- Arrows representing variation -->
  <!-- 1. From +inf down to -2 -->
  <path d="M 138 112 L 195 146" class="arrow-line" />
  <!-- 2. From -2 up to 0 -->
  <path d="M 215 146 L 273 115" class="arrow-line" />
  <!-- 3. From 0 down to -2 -->
  <path d="M 297 115 L 355 146" class="arrow-line" />
  <!-- 4. From -2 up to +inf -->
  <path d="M 377 146 L 442 112" class="arrow-line" />
</svg>
`)}`;

export const GRAPH_CURVE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 300" width="100%" height="260" style="background:#ffffff; font-family: 'Times New Roman', serif;">
  <style>
    .axis { stroke: #334155; stroke-width: 1.5; marker-end: url(#axis-arrow); }
    .grid-dash { stroke: #94a3b8; stroke-width: 1; stroke-dasharray: 4,3; }
    .curve { stroke: #2563eb; stroke-width: 2.5; fill: none; stroke-linecap: round; }
    .label { font-size: 15px; font-style: italic; fill: #0f172a; text-anchor: middle; }
    .num { font-size: 14px; fill: #1e293b; text-anchor: middle; }
    .pt { fill: #2563eb; }
  </style>
  <defs>
    <marker id="axis-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 2 L 8 5 L 0 8 z" fill="#334155"/>
    </marker>
  </defs>

  <!-- Coordinate Axes Ox, Oy -->
  <!-- Ox axis -->
  <line x1="30" y1="180" x2="355" y2="180" class="axis" />
  <text x="350" y="198" class="label">x</text>

  <!-- Oy axis -->
  <line x1="190" y1="275" x2="190" y2="25" class="axis" />
  <text x="175" y="32" class="label">y</text>

  <!-- Origin O -->
  <text x="178" y="196" class="label">O</text>

  <!-- Dashed lines to local minimums (-1; -2) and (1; -2) -->
  <!-- Minimum at (-1, -2) : (x = 120, y = 240) -->
  <line x1="120" y1="180" x2="120" y2="240" class="grid-dash" />
  <line x1="120" y1="240" x2="190" y2="240" class="grid-dash" />

  <!-- Minimum at (1, -2) : (x = 260, y = 240) -->
  <line x1="260" y1="180" x2="260" y2="240" class="grid-dash" />
  <line x1="190" y1="240" x2="260" y2="240" class="grid-dash" />

  <!-- Ticks and coordinates numbers -->
  <text x="120" y="174" class="num">−1</text>
  <text x="260" y="174" class="num">1</text>
  <text x="174" y="244" class="num">−2</text>

  <!-- W-shaped polynomial curve y = x^4 - 2x^2 (scaled) -->
  <path d="
    M 70 50
    C 90 120, 100 240, 120 240
    C 140 240, 165 180, 190 180
    C 215 180, 240 240, 260 240
    C 280 240, 290 120, 310 50
  " class="curve" />

  <!-- Points on curve -->
  <circle cx="120" cy="240" r="3.5" class="pt" />
  <circle cx="190" cy="180" r="3.5" class="pt" />
  <circle cx="260" cy="240" r="3.5" class="pt" />
</svg>
`)}`;
