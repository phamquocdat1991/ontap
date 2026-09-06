# Ôn tập AI — Learning Hub GDPT 2018

Ứng dụng học tập và khảo thí dành cho giáo viên, học sinh Việt Nam. Phiên bản 2 tập trung vào giao diện sáng chuyên nghiệp, chế độ tối, trải nghiệm di động, tiến độ học thật theo từng học liệu và quy trình làm bài/chấm bài an toàn ở phía máy chủ.

## Chức năng

### Giáo viên và quản trị viên

- Quản lý lớp, học sinh, khóa học, chương và bài học.
- Soạn nội dung, câu hỏi, ma trận và đề kiểm tra bằng Gemini khi máy chủ đã cấu hình API key.
- Quản lý URL PDF, DOCX, PPTX, hình ảnh và video theo từng bài học.
- Chấm trắc nghiệm xác định ở máy chủ, sơ khảo tự luận bằng rubric và bắt buộc giáo viên duyệt khi độ tin cậy thấp.
- Ghi nhật ký và đồng bộ đủ 15 cột sang Google Sheets bằng tài khoản dịch vụ.
- Dashboard dùng dữ liệu tiến độ và kết quả thực tế, không chèn KPI giả khi chưa có dữ liệu.

### Học sinh

- Xem khóa học, bài học và đề thi đã công bố, đúng lớp được giao.
- Theo dõi riêng từng tài liệu: trang đã đọc và các phân đoạn video đã xem; không tính tua video là hoàn thành.
- Làm bài luyện tập tối đa theo cấu hình, khôi phục lượt đang làm và nhận lời giải sau khi nộp.
- Làm bài thi có đồng hồ theo deadline máy chủ, khôi phục phiên, hỗ trợ trắc nghiệm, đúng/sai, trả lời ngắn và tự luận.
- Đáp án, lời giải và rubric không được gửi xuống trình duyệt trước khi nộp.

## Chạy cục bộ

Yêu cầu Node.js 22.

```bash
npm install
npm run dev:full
```

Ứng dụng chạy tại `http://localhost:3000`; Express phục vụ `/api` và Vite phục vụ giao diện. `npm run dev` dùng máy chủ Vite kèm API bộ nhớ tạm để xem trước/QA.

```bash
npm run check
```

Lệnh trên chạy TypeScript, 10 bộ regression, kiểm thử tích hợp API và build production.

## Biến môi trường

```env
# Bắt buộc nếu dùng các tính năng sinh/chấm bằng Gemini
GEMINI_API_KEY=

# Một trong hai cách cấp tài khoản dịch vụ Google
FIREBASE_SERVICE_ACCOUNT_JSON=
# hoặc
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_PROJECT_ID=

# Tùy chọn, mặc định BangDiem!A:O
GOOGLE_SHEETS_RANGE=BangDiem!A:O
```

Trang tính phải được chia sẻ quyền chỉnh sửa cho email của tài khoản dịch vụ. Hệ thống chỉ báo `success` sau khi Google Sheets API xác nhận lệnh ghi.

## Kiến trúc dữ liệu hiện tại

- Khi chạy cục bộ, dữ liệu đọc/ghi tại `data/store.json`.
- Toàn bộ người dùng, trường/lớp và kết quả đi kèm repository là dữ liệu tổng hợp để demo (`example.invalid`), không phải hồ sơ thật.
- Trên Vercel, Function dùng bản seed trong bộ nhớ vì hệ thống tệp chỉ đọc. Dữ liệu tạo mới có thể mất khi Function khởi động lạnh hoặc deploy lại.
- Các tệp `firebase*.json`, rules và báo cáo P1/P2/P3 trong repository là tài liệu thiết kế cũ; runtime hiện tại chưa dùng Firebase Auth/Firestore/Storage.

## Lưu ý bảo mật trước khi dùng thật

Chuyển tài khoản hiện tại là chế độ demo QA thông qua header `x-user-id`, không phải đăng nhập bảo mật. Trước khi dùng cho học sinh thật cần thay bằng Firebase Auth/Clerk/Auth0, xác minh token ở API, phân quyền theo tenant/trường và chuyển dữ liệu sang cơ sở dữ liệu bền vững. API đã kiểm tra vai trò, quyền sở hữu lượt làm bài và ẩn đáp án, nhưng header demo không được xem là cơ chế xác thực production.

## Deploy Vercel

Project dùng `vercel.json`: Vite build giao diện vào `dist`, còn `api/index.ts` là Express Function. Nhánh `main` có thể được kết nối trực tiếp với Vercel; thiết lập các biến môi trường ở Production trước khi bật Gemini hoặc Google Sheets.

## Ưu tiên nâng cấp tiếp theo

1. Xác thực thật + Postgres/Firestore bền vững + object storage có signed upload.
2. Versioning nội dung, nhật ký duyệt và audit log cho giáo viên/quản trị viên.
3. Thông báo hạn bài, báo cáo theo chuẩn năng lực và gợi ý ôn tập cá nhân hóa.
