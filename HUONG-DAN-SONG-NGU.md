# Hướng dẫn song ngữ VI/EN

**Giao diện học sinh** (trang chủ, làm bài, kết quả, đăng nhập): khóa nằm trong `src/i18n/LanguageContext.tsx`, dùng `t('khoa')`. Thêm khóa vào cả khối `vi` và `en`.

**Khu quản trị giáo viên**: dùng `tr('Câu tiếng Việt')`, bản tiếng Anh nằm trong `src/i18n/adminDict.ts` (khóa là câu tiếng Việt gốc). Câu nào chưa có bản dịch sẽ hiện tiếng Việt. Khoảng 240 dòng chứa chữ ghép với biến (ví dụ "Đã chọn {n} lớp") hoặc chuỗi có `${...}` chưa được bọc `tr()`.

**Đề thi**: thêm trường `en` vào đề hoặc khai báo trong `src/data/translations.ts`. Trường nào chưa dịch sẽ hiện tiếng Việt.

Chưa dịch: lời giải câu 1-16 của đề 101, đề 02 và 03 (nội dung câu hỏi).

## Trang chủ chỉnh sửa được (v4)
Giáo viên đăng nhập, bấm "Chỉnh sửa trang chủ" (hoặc vào Quản trị > Trang chủ) để đổi tên hệ thống, tên trường, tiêu đề, mô tả (VI/EN), màu chủ đạo và bật/tắt các khối. Dữ liệu lưu ở Firestore: `site_settings/home`. Mặc định nằm ở `src/data/homeSettings.ts`.

## v4.3: dùng cho nhiều môn
- Thanh trên cùng chỉ hiện tên trường; không còn chữ "Toán 12". Khung "Tiến độ của em" đã bỏ khỏi trang chủ.
- Khung "Cấu trúc đề 22 câu" đã thay bằng khung "Kho đề luyện tập" (số đề, tổng số câu, thời gian trung bình, số đề theo môn). Bộ lọc môn học tự sinh từ trường "Môn" của từng đề.

## v4.6.1 (làm tiếp trên v4.6)
- Cửa sổ sửa đề có thêm tab **Bảng đáp án**: xem và sửa đáp án của cả đề tại một nơi (Phần I chọn A/B/C/D, Phần II chọn Đúng/Sai từng ý, Phần III nhập đáp số và các đáp án chấp nhận khác). Có ô nhập nhanh đáp án Phần I ("ABCDDBCA" hoặc "1A 2C 3B"), lọc câu thiếu đáp án, bấm "Câu n" để mở câu đó trong trình soạn.
- Trang kết quả: phần đầu gọn hơn, ô điểm đổi màu theo kết quả (xanh lá, xanh ngọc, vàng, đỏ nhạt), bộ lọc câu hỏi tự tính theo đề thật.
- File thay đổi so với v4.6: src/components/ExamEditorModal.tsx, src/components/AnswerKeyTab.tsx (mới), src/pages/ResultPage.tsx, src/i18n/adminDict.ts.

## v4.6.2 (v4.6.1 + tab Kết quả theo lớp)
- Tab Kết quả có hai chế độ: "Theo lớp" (sĩ số, đã nộp, chưa nộp, lượt nộp, điểm TB, cao nhất, thấp nhất, % từ 5 và từ 8 điểm) và "Chi tiết bài làm". Lọc theo đề thi và theo lớp. Chưa có bài làm nào vẫn thấy bảng lớp; nút Xuất Excel sáng lên khi có bài.
- Chọn một đề: có danh sách "Chưa nộp bài", sao chép được.
- Xuất Excel: sheet Tổng hợp theo lớp, Tất cả bài làm, mỗi lớp một sheet (khi có nhiều lớp), Chưa nộp bài (khi đã chọn đề). Điểm xuất dạng số.
- File thêm/đổi so với v4.6.1: src/components/ResultsTab.tsx (mới), src/utils/resultsExport.ts (mới), src/pages/TeacherAdminPage.tsx, src/i18n/LanguageContext.tsx.

## v4.6.3
- Bấm tên học sinh trong tab Kết quả > Chi tiết bài làm: mở cửa sổ chi tiết (bản đồ câu đúng/sai/một phần/bỏ trống, "đúng liên tiếp đến câu...", từng câu so sánh bài làm với đáp án, xem đề bài). Chấm lại theo đáp án hiện tại của đề.
- Đăng nhập học sinh: chỉ tài khoản có sẵn (tên tài khoản hoặc SBD) và đúng mật khẩu. Bỏ đăng nhập nhanh theo tên tự gõ, bỏ tài khoản demo "hocsinh" không cần kiểm tra, bỏ mật khẩu chung 123 và 123456, bắt buộc nhập mật khẩu. Phiên đăng nhập cũ của học sinh không có tài khoản bị đăng xuất.
- File thay đổi: src/context/AuthContext.tsx, src/components/StudentLoginModal.tsx, src/components/StudentResultDetail.tsx (mới), src/components/ResultsTab.tsx, src/utils/gradeResult.ts (mới), src/pages/TeacherAdminPage.tsx, src/i18n/LanguageContext.tsx, src/i18n/adminDict.ts.

## v4.6.4
- Khung đăng nhập (học sinh và giáo viên): bỏ viền xanh khi bấm vào ô nhập, chỉ đổi viền sang xám đậm nhẹ. Nguyên nhân khung xanh thứ hai: quy tắc viền focus chung trong src/index.css nằm ngoài lớp base nên đè mất `focus:outline-none`; đã chuyển vào `@layer base`, nên các ô nhập khác đã tự đặt kiểu focus cũng hết bị viền đôi.
- File thay đổi: src/index.css, src/components/StudentLoginModal.tsx, src/components/TeacherLoginModal.tsx.

## v4.6.5
- Cửa sổ Học sinh đăng nhập: biểu tượng và nút "Đăng nhập" đổi từ xanh dương sang màu chủ đạo của hệ thống (theo màu thầy chọn ở Quản trị > Trang chủ). File: src/components/StudentLoginModal.tsx.

## v4.6.6
- Hệ thống không còn tự tạo lớp mẫu (12A1, 12A2, 12A3, 12D1). Trước đây mỗi khi danh sách lớp trên Firestore trống, App.tsx tự ghi 4 lớp này vào cơ sở dữ liệu, và lúc mới mở trang cũng hiện sẵn chúng.
- Tab Học sinh: nếu các lớp mẫu cũ vẫn còn, có khung vàng với nút "Xóa các lớp mẫu". Nếu có học sinh thuộc lớp chưa có trong danh sách lớp, có khung gợi ý bấm tên lớp để tạo lớp (hoặc "Tạo tất cả").
- File thay đổi: src/App.tsx, src/components/ClassManagementTab.tsx, src/i18n/adminDict.ts.

## v4.6.7
- Tab Học sinh > danh sách học sinh của lớp: nút bút chì ở cột Thao tác để sửa họ tên học sinh (Enter để lưu, Esc để đóng). Tên đăng nhập, mật khẩu và mã HS không đổi.
- Tab Kết quả luôn hiển thị tên hiện tại của học sinh, nên các bài đã nộp trước đó cũng hiện tên mới (bản lưu gốc trong cơ sở dữ liệu không bị sửa).
- File thay đổi: src/components/EditStudentNameModal.tsx (mới), src/components/ClassManagementTab.tsx, src/components/ResultsTab.tsx, src/pages/TeacherAdminPage.tsx, src/i18n/adminDict.ts.

## v4.6.8
- Sửa lỗi tiếng Việt khi nhập danh sách học sinh từ Excel (và file xuất ra từ đó): hàm đổi bảng mã TCVN3 cũ trước đây áp dụng cho cả chữ Unicode đúng chuẩn, làm "Thúy" thành "Thỳy", "Võ" thành "Vừ", "Lê" thành "Lờ", "Thái" thành "Thỏi". Giờ chỉ đổi khi chữ thật sự là TCVN3. Cũng sửa việc nhận diện tiêu đề cột "Tên", "Họ và tên" khi nhập.
- Tên học sinh đã nhập sai từ trước vẫn nằm trong cơ sở dữ liệu: sửa bằng nút bút chì (tab Học sinh), hoặc xóa tài khoản rồi nhập lại file Excel.
- Xuất Excel tài khoản: chuẩn hóa chữ Unicode dựng sẵn, tên sheet và tên file an toàn khi tên lớp dài hoặc có ký tự đặc biệt.
- File thay đổi: src/utils/excelUtils.ts.

## v4.6.9
- Nhập danh sách từ file .csv: trước đây đọc theo bảng mã Windows-1252 nên chữ UTF-8 bị vỡ ("Nguyá»…n"). Giờ tự nhận UTF-8 (có hoặc không BOM), UTF-16 (Excel "Unicode Text") và Windows-1258. File được nhận dạng theo nội dung chứ không chỉ theo đuôi file.
- Mọi ô chữ khi nhập, tên nhập tay, tên sửa và file xuất Excel được chuẩn hóa dạng chữ dựng sẵn (NFC), tránh dấu tiếng Việt bị lệch trong Excel.
- File thay đổi: src/utils/excelUtils.ts, src/components/ManualAddStudentModal.tsx, src/components/EditStudentNameModal.tsx.

## v4.6.10
- Dải màu tím trên cùng khi mới mở trang là thanh "Đang chuyển dữ liệu lên Cloud Firestore..." (CloudSyncIndicator, màu bg-purple-700 còn sót từ giao diện cũ). Mỗi lần mở trang hệ thống đều kiểm tra dữ liệu và bật thanh này vài giây dù không có gì để chuyển. Giờ thanh chỉ hiện khi thật sự có chuyển dữ liệu (lần đầu), và đổi sang màu chủ đạo.
- Nút "Bảng nháp" ở trang làm bài đổi từ tím sang màu chủ đạo.
- File thay đổi: src/components/CloudSyncIndicator.tsx, src/services/firestoreService.ts, src/pages/ExamPage.tsx.
