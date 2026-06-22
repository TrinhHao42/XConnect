# XConnect - Real-time Communication & Hybrid Mobile Platform

**XConnect** là một nền tảng giao tiếp trực tuyến thời gian thực (Real-time Communication) toàn diện, bao gồm nhắn tin (chat), cuộc gọi thoại/video độ trễ thấp và hệ thống kết bạn trực tuyến. Dự án được thiết kế với kiến trúc Micro-services/Modular Monolith ở Backend, sử dụng Next.js hiện đại ở Frontend và tích hợp Capacitor để đóng gói ứng dụng di động lai (Hybrid Mobile App) chạy trên hệ điều hành Android.

Dự án này là minh chứng cho khả năng thiết kế hệ thống phân tán, xử lý kết nối thời gian thực quy mô lớn (WebSockets), tối ưu hóa truyền dẫn đa phương tiện (WebRTC/Agora RTC) và triển khai các giải pháp bảo mật nâng cao cho hệ thống xác thực.

---

## 🚀 Các Điểm Nhấn Công Nghệ Ấn Tượng (CV Highlights)

Khi đưa dự án này vào CV, bạn có thể nhấn mạnh các giải pháp kỹ thuật nâng cao sau đây mà bạn đã triển khai thành công:

1. **Kiến Trúc Xác Thực An Toàn Nâng Cao (Advanced Security & Auth Architecture)**:
   - **Mã Hóa Khóa Chính (Primary Key Obfuscation)**: Triển khai mã hóa AES-256-CBC để mã hóa tất cả các User ID (MongoDB ObjectID) trước khi đưa vào Payload của JWT Access Token. Điều này ngăn chặn việc rò rỉ cấu trúc DB và định danh người dùng ở phía client.
   - **Xoay Vòng Refresh Token (Refresh Token Rotation - RTR)**: Lưu trữ và quản lý phiên đăng nhập qua Redis. Phát hiện các cuộc tấn công phát lại mã (Replay Attacks) bằng cách tự động thu hồi toàn bộ tất cả các phiên đăng nhập đang hoạt động của người dùng nếu phát hiện một Refresh Token đã từng sử dụng trước đó cố gắng truy cập lại hệ thống.
   - **Access Token Blacklisting**: Thiết lập cơ chế thu hồi Access Token ngay khi người dùng đăng xuất (Logout) bằng cách đưa token đó vào danh sách đen (Blacklist) trong Redis với thời gian hết hạn (TTL) tự động đồng bộ theo thời hạn còn lại của token.
   - **Khôi phục mật khẩu thông qua mã OTP lưu trong Redis**: Tạo mã xác thực OTP 6 chữ số ngẫu nhiên phục vụ quá trình lấy lại mật khẩu với thời hạn lưu trữ tạm thời 15 phút.

2. **Hạ Tầng Giao Tiếp Thời Gian Thực Hiệu Năng Cao (High-performance Real-time Gateway)**:
   - Sử dụng **Socket.io** trên NestJS để thiết lập cổng kết nối WebSockets với các không gian tên (namespaces) chuyên biệt (`chat` và `call`), giúp cô lập luồng truyền tin nhắn và luồng báo hiệu cuộc gọi.
   - Triển khai **Optimistic UI Updates** ở phía Next.js Client: Tin nhắn gửi đi được đẩy tức thì lên giao diện với trạng thái "đang gửi" nhờ mã định danh tạm thời `tempId`, sau đó tự động cập nhật trạng thái "đã gửi" khi nhận được sự kiện phản hồi từ Socket.io Gateway, mang lại trải nghiệm mượt mà không có độ trễ cho người dùng.
   - Hỗ trợ tính năng **Thu hồi tin nhắn (Recall Message)** đồng bộ trạng thái trực tiếp đến tất cả các thành viên trong phòng chat ngay lập tức với cơ chế kiểm tra quyền hạn chặt chẽ ở backend.

3. **Tích Hợp Cuộc Gọi Thoại & Video Độ Trễ Thấp (Low-latency WebRTC & Agora Integration)**:
   - Thiết lập luồng báo hiệu WebRTC (Signaling) qua Socket Gateway nhằm hỗ trợ kết nối trực tiếp peer-to-peer.
   - Tích hợp **Agora RTC SDK** với quy trình sinh token bảo mật động (`RtcTokenBuilder` ở NestJS Backend) cho các phòng gọi âm thanh/hình ảnh chất lượng cao.
   - Tối ưu hóa chất lượng âm thanh trực tiếp trên thiết bị đầu cuối thông qua việc cấu hình: **Khử tiếng vọng (AEC - Acoustic Echo Cancellation)**, **Chống ồn tự động (ANS - Automatic Noise Suppression)** và **Tự động cân bằng âm lượng (AGC - Automatic Gain Control)**.
   - Giao diện **Call Overlay** tương tác hoàn chỉnh: Xử lý trạng thái cuộc gọi phức tạp từ Zustand Store, cho phép tắt/bật camera/micrô, tăng giảm âm lượng của từng kênh track âm thanh đầu ra và tự động giải phóng tài nguyên phần cứng (Memory/Track Clean Sweep) ngay khi kết thúc cuộc gọi.

4. **Khả Năng Đóng Gói Ứng Dụng Di Động Lai (Hybrid Mobile Readiness)**:
   - Sử dụng **Capacitor CLI** để cấu hình và đồng bộ hóa mã nguồn Next.js tĩnh (`out` directory) sang dự án Android Native.
   - Tích hợp thành công SDK đăng nhập **Google OAuth** trên nền tảng di động thông qua `@codetrix-studio/capacitor-google-auth` liên kết dịch vụ xác thực Supabase.

---

## 🛠️ Công Nghệ & Thư Viện Sử Dụng (Tech Stack)

### Frontend (xconnect_frontend)
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React
- **Quản lý trạng thái (State Management)**: Zustand (cho Auth, Chat, Call, Friend và Đa ngôn ngữ)
- **Real-time**: Socket.io-client (v4)
- **Media**: Agora RTC SDK (`agora-rtc-sdk-ng`), Simple-peer (WebRTC)
- **Animations & UI**: Framer Motion, Sonner (Toasts)
- **Security & Utilities**: DOMPurify (Chống XSS khi hiển thị tin nhắn chat), Emoji-picker-react
- **Mobile Integration**: Capacitor Core, Capacitor Android, Capacitor Google Auth

### Backend (XConnect_backend)
- **Framework**: NestJS v11, Node.js
- **Database ORM**: Prisma ORM v6
- **Database**: MongoDB (qua kết nối URI bảo mật)
- **Caching & Session Storage**: Redis (ioredis v5)
- **Security & Cryptography**: Bcryptjs, Crypto, Passport JWT, Passport Google OAuth2.0
- **Real-time Server**: `@nestjs/websockets`, `@nestjs/platform-socket.io` (Socket.io v4)
- **Media Tokens**: `agora-access-token` (Tự động tạo token Agora có chữ ký bảo mật từ Backend)
- **Containerization**: Docker (Multi-stage build Dockerfile tối ưu kích thước image chạy production)

---

## 📌 Các Tính Năng Chi Tiết Trong Hệ Thống

### 💬 Hệ Thống Nhắn Tin (Chat Module)
- **Nhắn tin trực tiếp (1v1)**: Tự động khởi tạo hội thoại bảo mật giữa 2 người dùng. Hỗ trợ tự nhắn tin cho bản thân (Self-chat làm ghi chú cá nhân).
- **Trò chuyện nhóm nâng cao**:
  - Yêu cầu nhóm có tối thiểu 3 thành viên để khởi tạo.
  - **Phân quyền vai trò (Admin Rules)**: Chỉ có trưởng nhóm (Group Leader) mới được giải tán nhóm (Dissolve), chuyển quyền trưởng nhóm (Transfer Leadership) hoặc đuổi thành viên (Kick).
  - **Quyền thêm thành viên**: Cấu hình chế độ cho phép tất cả mọi người (`all`) hoặc chỉ trưởng nhóm mới được thêm người mới (`leader_only`).
  - **Kênh thông báo (Announcement Channel)**: Chế độ gửi tin nhắn hạn chế (`messageSendMode: restricted`) - chỉ trưởng nhóm và các thành viên được cấp quyền (`allowedSenderIds`) mới được phép nhắn tin, các thành viên khác chỉ được đọc.

### 👥 Quản Lý Bạn Bè (Friendship Module)
- Gửi lời mời kết bạn (real-time WebSocket banner thông báo đến người nhận).
- Chấp nhận/Từ chối lời mời kết bạn cập nhật trực tiếp trạng thái quan hệ song phương trong cơ sở dữ liệu.
- Liệt kê danh sách bạn bè, kiểm tra chi tiết trạng thái quan hệ (`friends`, `pending_sent`, `pending_received`, `none`).

### 📞 Cuộc Gọi Thoại & Video (Call Module)
- Giao diện gọi điện Overlay đẹp mắt, hiện đại với hiệu ứng Glassmorphism.
- Hỗ trợ các pha cuộc gọi trực quan: Đang đổ chuông đi (`ringing-out`), đổ chuông đến (`ringing-in`), đang kết nối (`connecting`), và đang hoạt động (`active`).
- Quản lý cuộc gọi đồng thời: Tự động từ chối bằng trạng thái `busy` nếu người nhận đang trong cuộc gọi khác.

---

## 📁 Cấu Trúc Thư Mục Dự Án Chính

```text
XConnect/
├── XConnect_backend/          # NestJS Backend API
│   ├── prisma/                # Schema định nghĩa cơ sở dữ liệu MongoDB
│   ├── src/
│   │   ├── auth/              # Module xác thực người dùng, xử lý mã hóa JWT và Redis token logic
│   │   ├── call/              # Module cuộc gọi (Agora token, signaling gateway)
│   │   ├── chat/              # Module tin nhắn & hội thoại (Prisma DB queries)
│   │   ├── common/            # Các utility mã hóa (AES-256) và filters hệ thống
│   │   ├── socket/            # Gateway WebSockets trung tâm
│   │   └── main.ts            # Entry point của ứng dụng Backend
│   └── Dockerfile             # Multi-stage Dockerfile cho Production
│
└── xconnect_frontend/         # Next.js App Router Client
    ├── app/                   # Next.js Pages & Routing ((auth), (protected), (chat))
    ├── components/
    │   ├── call/              # CallProvider quản lý luồng Agora RTC và CallOverlay UI
    │   ├── chat/              # ChatArea, GroupCreateModal, GroupManageModal, RightSidebar...
    │   └── landing/           # Landing page giới thiệu ứng dụng
    ├── libs/                  # Trình thiết lập API Axios và Socket.io-client
    ├── store/                 # Zustand global stores (Auth, Chat, Call, Friend...)
    └── capacitor.config.ts    # File cấu hình Capacitor cho Android
```

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Thử (Development Setup)

### Yêu cầu hệ thống
- **Node.js**: Phiên bản 20 hoặc 22.
- **MongoDB**: Đã chạy local hoặc MongoDB Atlas.
- **Redis**: Đã chạy local hoặc Redis Cloud.
- **Agora Account**: Đã đăng ký và lấy App ID / App Certificate.

### 1. Cấu hình Backend
Di chuyển vào thư mục `XConnect_backend` và tạo file `.env`:
```bash
cd XConnect_backend
cp .env.example .env # hoặc tự tạo mới
```

Các biến môi trường cần cấu hình trong `.env`:
```env
PORT=8080
MONGODB_URI="mongodb://localhost:27017/xconnect"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="your_jwt_secret_key"
TOKEN_ENCRYPTION_KEY="xconnect_token_encryption_key_32" # Phải đúng 32 ký tự
AGORA_APP_ID="your_agora_app_id"
AGORA_APP_CERTIFICATE="your_agora_app_certificate"
SUPABASE_URL="your_supabase_project_url"
SUPABASE_ANON_KEY="your_supabase_anon_key"
```

Cài đặt thư viện và chạy:
```bash
npm install
npx prisma generate
npm run start:dev
```

### 2. Cấu hình Frontend
Di chuyển vào thư mục `xconnect_frontend` và tạo file `.env`:
```bash
cd ../xconnect_frontend
```

Các biến môi trường cần cấu hình trong `.env`:
```env
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXT_PUBLIC_SOCKET_URL="http://localhost:8080"
NEXT_PUBLIC_AGORA_APP_ID="your_agora_app_id"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

Cài đặt thư viện và chạy:
```bash
npm install
npm run dev
```

Truy cập ứng dụng tại địa chỉ: [http://localhost:3000](http://localhost:3000).

---

## 🐋 Deploy với Docker (Backend)

Dự án cung cấp sẵn Dockerfile tối ưu đa tầng (Multi-stage build) giúp giảm kích thước image chạy thực tế:

```bash
cd XConnect_backend
docker build -t xconnect-backend .
docker run -d -p 8080:8080 --env-file .env xconnect-backend
```
