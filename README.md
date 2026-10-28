# 🎀 Hello Kitty Quiz – Website Luyện Thi Trắc Nghiệm Online

Website luyện thi trắc nghiệm trực tuyến phong cách **Hello Kitty Pink** dễ thương, sang trọng, gọn gàng và tối ưu khả năng đọc hiểu câu hỏi. Hệ thống kết nối cơ sở dữ liệu thực tế (**SQLite + Prisma ORM**) với toàn bộ ngân hàng **160 câu hỏi (4 chương × 40 câu)** được nạp từ file `nganhangcauhoi.txt`.

---

## ✨ Tính năng chính đã triển khai

1. **Hai khu vực điều hướng trực quan**:
   - **Đề kiểm tra**: Chuyển đổi mượt mà giữa **A. Luyện tập theo chương** và **B. Làm đề tổng hợp**.
   - **Lịch sử làm bài**: Theo dõi danh sách các lần thi đã hoàn thành và xem lại chi tiết từng câu.
2. **Luyện tập theo chương**:
   - Đọc danh sách chương và số lượng câu hỏi trực tiếp từ cơ sở dữ liệu.
   - Công tắc **Bật / Tắt chế độ lọc mức độ câu hỏi** rõ ràng:
     - Khi **Bật**: Lọc theo **Nhận biết**, **Thông hiểu** (và hỗ trợ thêm **Vận dụng**, **Vận dụng cao**).
     - Khi **Tắt**: Lấy tất cả câu hỏi hợp lệ của chương đang chọn (mặc định 40 câu/đề).
   - Chọn số lượng câu hỏi (`10`, `20`, `30`, **`40 câu (Mặc định)`**, `Tất cả câu phù hợp`).
   - Công tắc **Xáo trộn câu hỏi** (bật mặc định).
   - Cảnh báo thông minh khi số câu yêu cầu lớn hơn số câu thực tế sau khi lọc, cho phép điều chỉnh hoặc tiếp tục với số câu hiện có.
3. **Làm đề tổng hợp**:
   - Lấy câu hỏi ngẫu nhiên cân bằng từ nhiều chương trong ngân hàng câu hỏi.
   - Hỗ trợ cấu hình **cơ cấu phân bổ mức độ** (ví dụ: `15 Nhận biết • 10 Thông hiểu • 10 Vận dụng • 5 Vận dụng cao`).
4. **Giao diện làm bài sang trọng & kawaii**:
   - Thanh tiến độ (progress bar), đồng hồ đếm thời gian, đánh dấu câu cần xem lại (`🎀`), bảng điều hướng nhanh đến từng câu.
   - Tự động lưu trạng thái bài đang làm vào `localStorage` và database (không mất đáp án khi chuyển câu hoặc tải lại trang).
   - Hộp thoại xác nhận khi nộp bài (cảnh báo rõ nếu còn câu chưa trả lời) và chống nộp trùng lặp.
5. **Chấm điểm, Kết quả & Xem lại lịch sử (Snapshot)**:
   - Hiển thị Điểm số (thang 10), Tỷ lệ chính xác (%), Tổng số câu, Số câu đúng, Số câu sai, Số câu chưa trả lời và Thời gian làm bài.
   - Xem lại chi tiết từng câu với bộ lọc: **Tất cả câu hỏi**, **Chỉ câu đúng**, **Chỉ câu sai**, **Chỉ câu chưa trả lời**, kèm **Giải thích chi tiết** và **Nguồn tài liệu**.
   - Cơ chế **Snapshot** giữ nguyên nội dung câu hỏi, lựa chọn và đáp án tại thời điểm thi.

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Canvas Confetti.
- **Backend**: Node.js + Express + TypeScript (`tsx`).
- **Database**: SQLite + Prisma ORM.

---

## 📁 Cấu trúc thư mục chính

```text
d:\embe\ÔN THI CÙNG PNGAN\
├── nganhangcauhoi.txt             # Ngân hàng câu hỏi gốc (4 chương, 160 câu kèm đáp án & giải thích)
├── package.json                   # Scripts tiện ích chạy dự án từ thư mục gốc
├── README.md                      # Tài liệu hướng dẫn cài đặt và sử dụng
├── backend/                       # Máy chủ API & Database
│   ├── prisma/
│   │   ├── schema.prisma          # Thiết kế bảng Chapter, Question, Option, ExamAttempt, AttemptAnswer
│   │   ├── migrations/            # Lịch sử migration SQLite
│   │   ├── seed.ts                # Script nạp dữ liệu từ nganhangcauhoi.txt vào SQLite
│   │   └── sample-data.json       # Dữ liệu mẫu JSON tách biệt để kiểm thử nhập liệu
│   └── src/
│       ├── index.ts               # Điểm khởi chạy Express Server (Port 3001)
│       ├── prisma.ts              # Khởi tạo Prisma Client
│       ├── routes/                # Các route API: chapters.ts, exams.ts, history.ts
│       ├── scripts/               # importBank.ts (kiểm tra/nhập JSON, TXT), verifyAll.ts (kiểm thử)
│       └── utils/bankParser.ts    # Bộ phân tích cú pháp file nganhangcauhoi.txt
└── frontend/                      # Giao diện người dùng React + TypeScript + Tailwind CSS
    ├── index.html
    ├── vite.config.ts             # Cấu hình Vite & Proxy /api -> http://localhost:3001
    └── src/
        ├── App.tsx                # Điều hướng chính và khôi phục phiên thi
        ├── components/
        │   ├── KittyDecorations.tsx # Header, Mascot & Nơ hồng SVG kawaii
        │   ├── ExamSetupView.tsx    # Giao diện chọn chương, bộ lọc & tạo đề tổng hợp
        │   ├── ActiveExamView.tsx   # Giao diện làm bài trắc nghiệm
        │   ├── ExamResultView.tsx   # Trang kết quả & xem lại giải thích chi tiết
        │   └── HistoryView.tsx      # Trang lịch sử làm bài
        ├── services/api.ts        # Kết nối REST API tới Backend
        ├── types/quiz.ts          # Định nghĩa kiểu dữ liệu TypeScript
        └── utils/formatters.ts    # Định dạng công thức khoa học, thời gian, localStorage
```

---

## 🚀 Hướng dẫn cài đặt, nạp dữ liệu và khởi chạy

### 1. Cài đặt thư viện

Từ thư mục gốc `d:\embe\ÔN THI CÙNG PNGAN`:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Khởi tạo Database và nạp ngân hàng câu hỏi

Chạy migration và nạp toàn bộ câu hỏi từ `nganhangcauhoi.txt`:

```bash
cd backend
npx prisma migrate dev
npm run seed
```

*(Lưu ý: Khi khởi động backend, nếu database đang trống, hệ thống cũng sẽ tự động đọc và nạp dữ liệu từ `nganhangcauhoi.txt`).*

Để kiểm tra hoặc nhập thêm câu hỏi từ file JSON tách biệt:

```bash
cd backend
npm run import:bank prisma/sample-data.json
```

### 3. Khởi chạy Backend và Frontend

- **Mở Terminal 1 (Chạy Backend tại `http://localhost:3001`)**:
  ```bash
  cd backend
  npm run dev
  ```

- **Mở Terminal 2 (Chạy Frontend tại `http://localhost:5173`)**:
  ```bash
  cd frontend
  npm run dev
  ```

Sau đó mở trình duyệt truy cập: **`http://localhost:5173`** 🎀
