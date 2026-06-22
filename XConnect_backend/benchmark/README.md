# XConnect Benchmark Suite

Bộ test benchmark cho dự án XConnect, viết bằng **[k6](https://k6.io/)** — chạy qua Docker, không cần cài global.

---

## 📁 Cấu trúc

```
benchmark/
├── k6/
│   ├── config.js            # Shared config, helpers
│   ├── 01_auth.js           # Auth API benchmark
│   ├── 02_chat_api.js       # Chat REST API benchmark
│   ├── 03_websocket.js      # WebSocket concurrent connections
│   ├── 04_stress.js         # Stress test (tìm breaking point)
│   └── 05_token_security.js # Redis blacklist & token rotation
├── results/                 # Auto-generated kết quả JSON
├── run_all.sh               # Chạy tất cả (trừ stress)
└── README.md
```

---

## 🚀 Chạy Nhanh (Windows PowerShell)

> **Yêu cầu**: Docker Desktop đang chạy + Backend server đang chạy ở port 8080

### 1. Chạy từng test riêng lẻ

```powershell
# 01 — Auth: Login load + Register spike
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/01_auth.js

# 02 — Chat API: Read-heavy + Write moderate
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/02_chat_api.js

# 03 — WebSocket: Concurrent connections
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/03_websocket.js

# 05 — Security: Redis blacklist + Token rotation
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/05_token_security.js
```

### 2. Stress test (chạy riêng, tải cao)

```powershell
# ⚠️ Test này tăng lên 400 req/s — chỉ chạy môi trường test
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  grafana/k6 run /scripts/04_stress.js
```

### 3. Export kết quả ra file JSON

```powershell
docker run --rm -i --add-host=host.docker.internal:host-gateway `
  -e BASE_URL=http://host.docker.internal:8080 `
  -v ${PWD}/benchmark/k6:/scripts `
  -v ${PWD}/benchmark/results:/results `
  grafana/k6 run --out json=/results/auth_result.json /scripts/01_auth.js
```

---

## 📊 Đọc Kết Quả

k6 in ra bảng tóm tắt sau mỗi lần chạy. Các metrics quan trọng:

| Metric | Ý nghĩa | Target |
|--------|---------|--------|
| `http_req_duration p(95)` | 95% request hoàn thành trong bao lâu | < 500ms |
| `http_req_duration p(99)` | 99% request hoàn thành trong bao lâu | < 1s |
| `http_req_failed` | Tỷ lệ request bị lỗi (5xx, timeout) | < 1% |
| `http_reqs` | Tổng số request đã thực hiện | — |
| `iterations` | Số lần chạy function mỗi giây | — |
| `vus` | Số Virtual Users (connections) đồng thời | — |

### Custom Metrics theo từng test

| Test | Metric | Ý nghĩa |
|------|--------|---------|
| 01 Auth | `login_success_rate` | Tỷ lệ đăng nhập thành công |
| 01 Auth | `auth_me_duration_ms` | Latency của GET /auth/me |
| 03 WS | `ws_connect_success` | Tỷ lệ WS kết nối thành công |
| 03 WS | `ws_message_roundtrip_ms` | RTT gửi/nhận message qua Socket |
| 05 Security | `blacklist_check_ms` | Redis blacklist lookup time |
| 05 Security | `blacklist_effective` | Tỷ lệ blacklist hoạt động đúng |
| 05 Security | `token_refresh_ms` | Thời gian rotate refresh token |

---

## 🔍 Phân Tích Kết Quả Stress Test (04)

Sau khi chạy stress test, tìm **breaking point** trong output:

```
stages:
  10 req/s  → error_rate ~0%   → OK ✅
  50 req/s  → error_rate ~0%   → OK ✅
  100 req/s → error_rate ~0.5% → Degrading ⚠️
  200 req/s → error_rate ~3%   → Stressed ❗
  300 req/s → error_rate ~15%  → BREAKING POINT 💥
```

Breaking point là điểm `error_rate` bắt đầu tăng phi tuyến và `p99 duration` tăng đột biến.

---

## ⚙️ Tùy Chỉnh Load

Sửa trong từng file `.js`:

```js
// Tăng số VUs
stages: [
  { duration: '30s', target: 200 },  // ← Sửa số này
]

// Tăng arrival rate
rate: 100,  // ← req/s
```

---

## 🐳 Nếu Backend chạy trên port khác

```powershell
-e BASE_URL=http://host.docker.internal:3000   # port 3000
-e BASE_URL=http://192.168.1.100:8080          # IP cụ thể
```
