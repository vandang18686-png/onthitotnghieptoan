const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const REAL_MATH_EXAM_TEXT = `BỘ GIÁO DỤC VÀ ĐÀO TẠO
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

function escapeXml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDocumentXml(rawText) {
  const lines = rawText.split(/\r?\n/);
  const paragraphXmls = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      // Empty paragraph for natural vertical spacing
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
      // Divider line
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

    // Title / Institution headers
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
            <w:t xml:space="preserve">${escapeXml(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // Section headers: "PHẦN I:", "PHẦN II:", "PHẦN III:"
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
            <w:t xml:space="preserve">${escapeXml(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // Question line: "Câu 1: ...", "Câu 12: ..."
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
            <w:t xml:space="preserve">${escapeXml(qMatch[1])}</w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(qMatch[2])}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // Options: A., B., C., D. or a), b), c), d)
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
            <w:t xml:space="preserve">${escapeXml(optMatch[1])} </w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(optMatch[2])}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // Explanations / Answers: "Lời giải:", "Đáp số:", "Đáp án:"
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
            <w:t xml:space="preserve">${escapeXml(line)}</w:t>
          </w:r>
        </w:p>
      `);
      continue;
    }

    // Default regular paragraph
    paragraphXmls.push(`
      <w:p>
        <w:pPr>
          <w:spacing w:line="240" w:lineRule="auto" w:after="60"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(line)}</w:t>
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

async function buildDocxFile(text) {
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
  const docXml = buildDocumentXml(text);
  zip.file('word/document.xml', docXml);

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

async function main() {
  const outDir = path.resolve(__dirname, '../public/templates');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Generate real docx file
  const docxBuffer = await buildDocxFile(REAL_MATH_EXAM_TEXT);
  const docxPath = path.join(outDir, 'de_thi_mau_toan_chuan_cau_truc_2026.docx');
  fs.writeFileSync(docxPath, docxBuffer);
  console.log('Generated real docx at:', docxPath, 'Size:', docxBuffer.length, 'bytes');

  // 2. Also save text file for quick viewing/testing
  const txtPath = path.join(outDir, 'de_thi_mau_toan_chuan_cau_truc_2026.txt');
  fs.writeFileSync(txtPath, REAL_MATH_EXAM_TEXT, 'utf8');
  console.log('Generated txt at:', txtPath);
}

main().catch((err) => {
  console.error('Error generating template:', err);
  process.exit(1);
});
