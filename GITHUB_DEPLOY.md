# Hướng dẫn Deploy lên GitHub Pages

Để ứng dụng hoạt động trên GitHub mà không bị "trang trắng" và chạy được AI, bạn cần thực hiện các bước sau:

### 1. Cấu hình API Key
Vì GitHub Pages là trang tĩnh, ứng dụng cần API Key lúc build hoặc được cấu hình trong trình duyệt.
- **Cách 1 (Khuyên dùng):** Thêm API Key vào GitHub Secrets.
  - Vào Repo > Settings > Secrets and variables > Actions.
  - Tạo một secret mới tên là `VITE_GEMINI_API_KEY` và dán mã API của bạn vào.
- **Cách 2:** Tạo file `.env` ở máy cá nhân (không push lên GitHub) với nội dung:
  `VITE_GEMINI_API_KEY=your_key_here`
  Sau đó chạy `npm run build`.

### 2. Lệnh Deploy
Nếu bạn đã clone repo về máy:
1. Chạy `npm install`
2. Chạy `npm run deploy` (Lệnh này sẽ tự động build và đẩy folder `dist` lên nhánh `gh-pages`).

### 3. Cấu hình trên GitHub
1. Truy cập vào Repo của bạn trên GitHub.
2. Vào **Settings > Pages**.
3. Tại mục **Build and deployment > Branch**, chọn nhánh `gh-pages` và folder `/ (root)`.
4. Nhấn Save. Đợi vài phút để GitHub cập nhật.

### 4. Khắc phục lỗi "Trang trắng"
- Nếu bạn thấy lỗi `404` cho các file `.js` hoặc `.css` trong Console (F12): Đảm bảo file `vite.config.ts` có dòng `base: './'`.
- Nếu lỗi `process is not defined`: Đã được fix trong bản cập nhật này (sử dụng `import.meta.env`).
