// ============================================================
// XConnect Benchmark — 05: Security & Token System
// ============================================================
// Kiểm tra: Redis token blacklisting performance,
//           Token refresh rotation speed,
//           Concurrent blacklist checks
//
// Chạy:
//   docker run --rm -i grafana/k6 run - < benchmark/k6/05_token_security.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const blacklistCheckDuration = new Trend('blacklist_check_ms');
const tokenRefreshDuration = new Trend('token_refresh_ms');
const refreshRotationSuccess = new Rate('refresh_rotation_success');
const blacklistEffective = new Rate('blacklist_effective');

export const options = {
  thresholds: {
    // Blacklist check (Redis lookup) phải cực nhanh
    blacklist_check_ms: ['p(95)<50', 'p(99)<100'],
    // Token refresh phải < 300ms
    token_refresh_ms: ['p(95)<300'],
    refresh_rotation_success: ['rate>0.95'],
    blacklist_effective: ['rate>0.99'],  // Blacklist phải hoạt động 99.9%+
  },

  scenarios: {
    // Test 1: Auth/me với token hợp lệ (benchmark Redis blacklist check)
    valid_token_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30s',
      tags: { scenario: 'valid_token' },
    },

    // Test 2: Logout → dùng lại token cũ (verify blacklist hoạt động)
    blacklist_verification: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 5,
      maxDuration: '60s',
      startTime: '35s',
      tags: { scenario: 'blacklist' },
      exec: 'blacklistVerificationFlow',
    },
  },
};

// ─── Setup ───────────────────────────────────────────────────
export function setup() {
  // Tạo pool users để dùng cho valid token load test
  const pool = [];
  for (let i = 0; i < 5; i++) {
    const email = randomEmail();
    const res = http.post(`${BASE_URL}/auth/register`,
      JSON.stringify({ email, password: 'BenchPass@123', name: `TokenUser${i}` }),
      { headers: jsonHeaders() }
    );
    const body = parseBody(res);
    if (body?.accessToken) {
      pool.push({
        accessToken: body.accessToken,
        email,
        password: 'BenchPass@123',
      });
    }
    sleep(0.1);
  }

  console.log(`✅ Setup: ${pool.length} users ready for token tests`);
  return { pool };
}

// ─── Default: Valid token → auth/me (Redis blacklist check) ──
export default function (data) {
  if (!data.pool || data.pool.length === 0) {
    sleep(1);
    return;
  }

  const user = data.pool[__VU % data.pool.length];

  group('Token: Valid auth/me (blacklist check benchmark)', () => {
    const start = Date.now();

    const res = http.get(`${BASE_URL}/auth/me`, {
      headers: jsonHeaders(user.accessToken),
      tags: { name: 'GET /auth/me (blacklist check)' },
    });

    blacklistCheckDuration.add(Date.now() - start);

    check(res, {
      'valid token: status 200': (r) => r.status === 200,
      'valid token: not blacklisted': (r) => r.status !== 401,
      'valid token: response < 50ms': (r) => r.timings.duration < 50,
    });
  });

  sleep(0.1);
}

// ─── Blacklist verification flow ──────────────────────────────
export function blacklistVerificationFlow(data) {
  // Đăng nhập → logout → dùng lại token → phải bị reject
  const email = randomEmail();
  const password = 'BenchPass@123';

  // 1. Register
  const regRes = http.post(`${BASE_URL}/auth/register`,
    JSON.stringify({ email, password, name: 'BlacklistTestUser' }),
    { headers: jsonHeaders() }
  );
  const regBody = parseBody(regRes);
  if (!regBody?.accessToken) {
    console.warn('Could not register for blacklist test');
    return;
  }

  const accessToken = regBody.accessToken;

  // 2. Xác nhận token hợp lệ
  const validRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(accessToken),
    tags: { name: 'blacklist: before logout' },
  });

  const wasValid = check(validRes, {
    'blacklist: token valid before logout': (r) => r.status === 200,
  });

  if (!wasValid) {
    console.warn('Token was invalid even before logout, skipping');
    return;
  }

  // 3. Logout (token vào blacklist)
  http.post(`${BASE_URL}/auth/logout`, null, {
    headers: jsonHeaders(accessToken),
    tags: { name: 'blacklist: logout' },
  });

  // 4. Đợi 100ms để Redis ghi hoàn tất
  sleep(0.1);

  // 5. Thử dùng lại token sau logout → phải bị reject (401)
  const reuseStart = Date.now();
  const reuseRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(accessToken),
    tags: { name: 'blacklist: after logout (should be 401)' },
  });
  blacklistCheckDuration.add(Date.now() - reuseStart);

  const isBlacklisted = check(reuseRes, {
    'blacklist: token rejected after logout': (r) => r.status === 401,
    'blacklist: check fast (< 100ms)': (r) => r.timings.duration < 100,
  });

  blacklistEffective.add(isBlacklisted);

  // 6. Test Token Refresh Rotation
  group('Token: Refresh Rotation', () => {
    // Login fresh để có refresh token cookie
    const loginRes = http.post(`${BASE_URL}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: jsonHeaders() }
    );
    const loginBody = parseBody(loginRes);

    if (loginRes.status !== 200 || !loginBody?.accessToken) {
      return;
    }

    // Lấy refresh token từ cookie (k6 tự lưu cookie)
    const refreshStart = Date.now();
    const refreshRes = http.post(`${BASE_URL}/auth/refresh`, null, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /auth/refresh' },
      // k6 tự gửi cookie _xcsid từ login response
    });
    tokenRefreshDuration.add(Date.now() - refreshStart);

    const refreshOk = check(refreshRes, {
      'refresh: status 200': (r) => r.status === 200,
      'refresh: has new accessToken': (r) => !!parseBody(r)?.accessToken,
      'refresh: rotation < 200ms': (r) => r.timings.duration < 200,
    });

    refreshRotationSuccess.add(refreshOk);
  });

  sleep(0.5);
}

export function teardown() {
  console.log('\n🔐 Security & Token Benchmark Complete');
  console.log('Key metrics:');
  console.log('  • blacklist_check_ms → Redis lookup latency');
  console.log('  • blacklist_effective → How reliably tokens are revoked');
  console.log('  • token_refresh_ms → Rotation speed');
}
