// ============================================================
// XConnect Benchmark — Shared Config & Utilities
// ============================================================

export const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

// Dùng chung cho tất cả test (override từng file nếu cần)
export const DEFAULT_THRESHOLDS = {
  // ≥95% request hoàn thành trong 500ms
  http_req_duration: ['p(95)<500'],
  // Tỷ lệ lỗi < 1%
  http_req_failed: ['rate<0.01'],
};

// JSON header mặc định
export function jsonHeaders(token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Parse response body an toàn
export function parseBody(res) {
  try {
    return JSON.parse(res.body);
  } catch (_) {
    return null;
  }
}

// Tạo email unique tuyệt đối: dùng VU + ITER + timestamp + random
// Tránh collision khi nhiều VU gọi cùng millisecond
export function randomEmail() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 9);
  // __VU và __ITER là k6 globals - unique per virtual user per iteration
  const vu   = typeof __VU   !== 'undefined' ? __VU   : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  return `bench_${vu}_${iter}_${ts}_${rand}@xc.test`;
}

export function randomString(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
