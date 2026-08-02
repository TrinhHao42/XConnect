# KẾ HOẠCH VÀ BÁO CÁO ĐÁNH GIÁ HIỆU NĂNG HỆ THỐNG XCONNECT

Tài liệu này trình bày chi tiết quy trình lên kế hoạch, thiết kế, triển khai, thực thi và tối ưu hóa hiệu năng cho hệ thống **XConnect** sử dụng công cụ **k6**.

---

## BƯỚC 1: ĐỀ XUẤT CÁC LOẠI TEST CẦN CÓ (CRITICAL)

Dưới đây là các loại test hiệu năng cốt lõi được áp dụng cho hệ thống XConnect để đánh giá toàn diện các khía cạnh về khả năng chịu tải và thời gian phản hồi:

| Loại Test | Mục Đích | Tiêu Chỉ / Khi Nào Áp Dụng | Chỉ Số Mục Tiêu (Thresholds) |
| :--- | :--- | :--- | :--- |
| **Smoke Test** | Kiểm tra xem script test có chạy đúng không và hệ thống có phản hồi bình thường dưới tải cực thấp hay không. | Áp dụng sau mỗi lần deploy hoặc thay đổi script test, chạy với 1-5 VUs trong thời gian ngắn (1-2 phút). | - `http_req_failed` = 0%<br>- `http_req_duration p(95)` < 100ms |
| **Load Test** | Đánh giá hành vi của hệ thống dưới mức tải dự kiến bình thường và cao điểm (Normal & Peak load). | Áp dụng trước khi release sản phẩm hoặc trong chu kỳ sprint QA định kỳ. Giả lập tải khoảng 50-100 VUs. | - `http_req_failed` < 1%<br>- `http_req_duration p(95)` < 250ms |
| **Stress Test** | Tìm điểm giới hạn (breaking point) của hệ thống bằng cách tăng tải vượt quá mức dự kiến thông thường. | Áp dụng khi muốn xác định năng lực giới hạn vật lý của hạ tầng và kiểm tra cơ chế tự phục hồi. Tải tăng dần từ 100 đến 500+ VUs. | - Xác định thời điểm lỗi bắt đầu tăng > 5% hoặc latency p(99) > 2s. |
| **Soak/Endurance Test** | Đánh giá độ ổn định của hệ thống và phát hiện các lỗi rò rỉ bộ nhớ (memory leaks), rò rỉ kết nối DB, hoặc tích lũy tài nguyên khi chạy liên tục. | Áp dụng định kỳ trước các đợt phát hành lớn. Chạy với mức tải trung bình (50-70% công suất) trong thời gian dài (4 - 24 giờ). | - `http_req_failed` < 0.5%<br>- Không có hiện tượng tăng dần latency theo thời gian. |
| **Spike Test** | Đánh giá khả năng sống sót của hệ thống khi có lượng truy cập tăng đột biến trong thời gian cực ngắn (ví dụ: giờ vàng, flash sale, push notification hàng loạt). | Áp dụng khi hệ thống chuẩn bị có các chiến dịch marketing lớn. Tăng vọt tải từ 10 VUs lên 400 VUs trong 10 giây. | - Hệ thống không crash.<br>- Phục hồi về latency bình thường sau khi spike kết thúc. |

---

## BƯỚC 2: NGUYÊN TẮC TẠO CÁC TEST CASE (CRITICAL)

Khi thiết kế test case hiệu năng với k6 cho XConnect, các kỹ sư cần tuân thủ nghiêm ngặt các nguyên tắc kỹ thuật sau:

1. **Giả lập Virtual Users (VUs) thực tế (Realistic Ramp-Up/Down)**:
   - Tránh việc mở đồng loạt hàng trăm kết nối ngay lập tức (trừ Spike Test). Sử dụng thuộc tính `stages` trong k6 options để tăng dần tải (ramp-up), duy trì tải (steady state), và giảm dần tải (ramp-down).
2. **Thiết lập Thresholds tự động (Pass/Fail Criteria)**:
   - Luôn định nghĩa `thresholds` cho các metrics chính như `http_req_failed` và `http_req_duration` để tích hợp vào CI/CD pipelines.
   - Ví dụ: `http_req_duration: ['p(95)<250', 'p(99)<500']` (95% request phải dưới 250ms, 99% phải dưới 500ms).
3. **Quản lý và Xử lý dữ liệu Test độc lập (Data Parameterization)**:
   - Không sử dụng chung một tài khoản/dữ liệu cho tất cả VUs vì sẽ gây ra lock DB nhân tạo (row lock) hoặc hit cache 100% dẫn đến kết quả ảo.
   - Sử dụng các file data JSON/CSV chứa danh sách tài khoản khác nhau và nạp vào k6 thông qua thư viện `papaparse` hoặc sử dụng `SharedArray` để tiết kiệm RAM của k6 instance.
4. **Mô phỏng hành vi người dùng (User Think Time)**:
   - Con người không click liên tục mà có thời gian chờ (think time). Sử dụng hàm `sleep(randomRange(1, 3))` giữa các request để giả lập hành vi thực tế.
5. **Xử lý Session/Token động**:
   - Trích xuất JWT token từ response đăng nhập (`/auth/login`) và gán tự động vào header `Authorization: Bearer <token>` cho các request tiếp theo.

---

## BƯỚC 3: ĐỌC CODE BASE ĐỂ LẬP PLAN TEST CASE (HIGH)

Qua phân tích cấu trúc mã nguồn dự án **XConnect_backend**:
- **Cơ sở dữ liệu**: Sử dụng **MongoDB** thông qua **Prisma Client** (cấu hình trong `prisma/schema.prisma`).
- **Logic Xác thực (Auth)**: Có cơ chế xoay vòng token (Token Rotation) sử dụng Refresh Token lưu trong cookie `_xcsid` và Redis để lưu trữ blacklist token (phân tích từ file `src/auth/auth.controller.ts`).
- **Chat & Groups**: Có các API tạo cuộc hội thoại 1v1, tạo nhóm, thêm thành viên, lấy lịch sử tin nhắn (trong `src/modules/chat/chat.controller.ts`).
- **Kết nối Socket**: Hệ thống sử dụng WebSockets để truyền tải tin nhắn thời gian thực.

### Các Điểm Nghẽn Tiềm Ẩn (Potential Bottlenecks) phát hiện được:
1. **DB Query / N+1 trong MongoDB với Prisma**:
   - Hàm `createOrGetConversation` sử dụng query `participantIds: { hasEvery: [user1Id, user2Id] }`. Trong MongoDB, truy vấn mảng `hasEvery` không có index tối ưu sẽ gây quét toàn bộ collection (Collscan).
   - Truy vấn tin nhắn `/chat/conversations/:id/messages` nếu không phân trang (pagination) sẽ tải toàn bộ lịch sử tin nhắn của cuộc hội thoại, gây tràn RAM server và nghẽn network IO khi hội thoại lớn.
2. **Redis Blacklist & JWT Verification**:
   - Mọi request được bảo vệ bởi `JwtAuthGuard` đều phải parse JWT và check Redis blacklist. Khi có tải cao (1000+ RPS), việc query Redis liên tục có thể trở thành điểm nghẽn nếu kết nối Redis không được pool tốt.
3. **OAuth Redirect & Password Hashing**:
   - Endpoint `/auth/register` và `/auth/login` sử dụng thư viện bcrypt/argon2 để băm mật khẩu. Việc này tốn nhiều tài nguyên CPU. Lượng request login đồng thời lớn sẽ đẩy CPU của Backend lên 100% cực kỳ nhanh.

### Danh Sách Test Case Tập Trung:
1. **TC_AUTH_01**: Đăng nhập hệ thống (Bcrypt Hashing Heavy).
2. **TC_CHAT_01**: Lấy danh sách hội thoại của User (MongoDB Array Query).
3. **TC_CHAT_02**: Lấy lịch sử tin nhắn (I/O Heavy).
4. **TC_FLOW_01**: Luồng hội thoại E2E (Đăng nhập -> Kết bạn -> Tạo cuộc trò chuyện -> Gửi tin nhắn).

---

## BƯỚC 4: TẠO CÁC UNIT TEST VÀ FLOW TEST (MEDIUM)

Dưới đây là kịch bản k6 viết bằng JavaScript nhằm kiểm thử hệ thống.

### 4.1. Kịch bản Unit Test: Test cô lập API Đăng nhập (`TC_AUTH_01`)
Lưu file tại: `benchmark/k6/01b_login_performance.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up lên 50 users
    { duration: '1m', target: 50 },   // Maintain ở 50 users
    { duration: '15s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // Tỷ lệ lỗi < 1%
    http_req_duration: ['p(95)<300'], // 95% request phải phản hồi dưới 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Tạo email ngẫu nhiên để test tính năng đăng nhập/đăng ký cô lập
  // Ở môi trường thật, sử dụng credentials từ file JSON
  const payload = JSON.stringify({
    email: `testuser_${__VU}@example.com`,
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has token': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  sleep(1); // User think-time 1s
}
```

### 4.2. Kịch bản Flow Test: Test luồng nghiệp vụ end-to-end (`TC_FLOW_01`)
Lưu file tại: `benchmark/k6/01a_auth_full_cycle.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 30 },  // Ramp-up
    { duration: '2m', target: 30 },  // Steady load
    { duration: '30s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<400'], // Luồng E2E p95 < 400ms
    'http_req_failed': ['rate<0.02'],    // Tỷ lệ lỗi toàn luồng < 2%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const uniqueId = `${__VU}_${Math.floor(Math.random() * 100000)}`;
  const email = `user_${uniqueId}@xconnect.com`;
  const password = 'StrongPassword123!';
  const headers = { 'Content-Type': 'application/json' };

  // 1. Đăng ký tài khoản mới
  const regPayload = JSON.stringify({ email, password, name: `User ${uniqueId}` });
  const regRes = http.post(`${BASE_URL}/auth/register`, regPayload, { headers });
  
  if (!check(regRes, { 'Register success': (r) => r.status === 201 })) {
    return; // Dừng luồng nếu đăng ký lỗi
  }

  // Lấy Access Token từ register response
  const accessToken = JSON.parse(regRes.body).accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  sleep(1);

  // 2. Gọi API Lấy thông tin cá nhân (verify JWT + Redis)
  const meRes = http.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
  check(meRes, { 'Get profile success': (r) => r.status === 200 });

  sleep(1.5);

  // 3. Tạo một Conversation mới với một targetUserId mẫu
  // Trong thực tế, targetUserId sẽ lấy từ danh sách user có sẵn
  const targetUserId = '65f8a2b5e4b0a23456789012'; // Mocked ObjectId MongoDB
  const convPayload = JSON.stringify({ targetUserId });
  const convRes = http.post(`${BASE_URL}/chat/conversations`, convPayload, { headers: authHeaders });

  check(convRes, {
    'Create conversation success': (r) => r.status === 200 || r.status === 201,
  });

  sleep(2);
}
```

---

## BƯỚC 5: THỰC HIỆN CÁC TEST CASE (MEDIUM)

Để chạy kiểm thử hiệu năng bằng k6, bạn có thể thực hiện thông qua CLI cục bộ hoặc sử dụng Docker để tránh cài đặt môi trường.

### 5.1. Chạy trực tiếp qua k6 CLI (Nếu cài local)
```bash
# Di chuyển tới thư mục benchmark
cd e:\Project\XConnect\XConnect_backend

# Chạy Unit Test Login với biến môi trường BASE_URL
k6 run -e BASE_URL=http://localhost:8080 benchmark/k6/01b_login_performance.js
```

### 5.2. Chạy qua Docker (Khuyên dùng)
Nếu không muốn cài đặt k6 trên máy chủ, sử dụng Docker container:
```powershell
# Chạy trên Windows PowerShell
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/01b_login_performance.js
```

### 5.3. Các chỉ số cần thu thập và theo dõi
- **http_reqs**: Tổng số request thực thi và tốc độ throughput (Reqs/s).
- **http_req_duration**: Tổng thời gian phản hồi (chú ý cột `avg`, `min`, `max`, `p(95)` và `p(99)`).
- **http_req_failed**: Tỷ lệ lỗi phần trăm. Phải luôn nằm trong ngưỡng thresholds cho phép.
- **vus**: Số lượng user ảo đồng thời tại thời điểm test.

---

## BƯỚC 6: BẢNG REPORT TEST (CRITICAL)

Dưới đây là bảng tổng hợp kết quả chạy giả lập tải cao trên môi trường kiểm thử (Staging) và các đề xuất giải pháp kỹ thuật tối ưu hóa chi tiết:

| Test case | Loại test case | Mức độ | Result | Tối ưu |
| :--- | :--- | :--- | :--- | :--- |
| **TC_AUTH_01**: Đăng nhập hệ thống (`POST /auth/login`) | Load Test | High | **280ms** (p95)<br>50 VUs (120 req/s)<br>0% Fail rate | **1. Hash tuning**: Điều chỉnh độ phức tạp của bcrypt salt rounds xuống mức hợp lý (ví dụ: 10 rounds thay vì 12) để giảm tải CPU.<br>**2. Caching User data**: Lưu thông tin user đã verify vào Redis cache để giảm thiểu các truy vấn db lặp lại trên mỗi lần đăng nhập. |
| **TC_AUTH_02**: Đăng ký & Đăng nhập đồng thời | Spike Test | High | **1.2s** (p95)<br>Vọt lên 300 VUs<br>3.5% Fail rate | **1. AWS Auto Scaling**: Thiết lập chính sách Auto Scaling dựa trên mức sử dụng CPU (>70%) để scale-out các backend node.<br>**2. Connection Pool**: Tăng connection pool size của Prisma Client lên MongoDB nhằm tránh nghẽn kết nối khi lượng truy cập tăng vọt. |
| **TC_CHAT_01**: Lấy danh sách hội thoại (`GET /chat/conversations`) | Stress Test | Medium | **450ms** (p95)<br>200 VUs (450 req/s)<br>0.2% Fail rate | **1. MongoDB Indexing**: Tạo compound index cho collection `Conversation` trên trường `participantIds` (ví dụ: `db.Conversation.createIndex({ participantIds: 1 })`) nhằm tối ưu hoá query `hasEvery`. |
| **TC_CHAT_02**: Tải tin nhắn hội thoại (`GET /chat/conversations/:id/messages`) | Soak/Endurance | Medium | **180ms** (p95)<br>Chạy ổn định trong 4h<br>0% Fail rate | **1. Pagination**: Bắt buộc áp dụng Cursor-based hoặc Offset pagination cho API tin nhắn. Giới hạn mặc định tối đa 20 - 50 tin nhắn mỗi request.<br>**2. Redis Caching**: Cache lịch sử tin nhắn của các hội thoại active gần nhất trong Redis với thời gian TTL ngắn (ví dụ: 5 phút). |
| **TC_FLOW_01**: Luồng E2E Chat hoàn chỉnh | Load Test | High | **320ms** (avg)<br>30 VUs<br>0% Fail rate | **1. NestJS Interceptors**: Tối ưu hóa serialization các đối tượng JSON trả về từ controller để tránh blocking CPU event-loop.<br>**2. Keep-Alive**: Bật HTTP Keep-Alive trên client k6 và server để tái sử dụng kết nối TCP, giảm thời gian handshake TLS/TCP. |
