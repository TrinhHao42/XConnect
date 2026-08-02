// ============================================================
// XConnect Benchmark — 01: Auth Endpoints (v2 - Robust)
// ============================================================
// Thiết kế: Mỗi VU tự register + login trong cùng iteration
// Không phụ thuộc shared account → không bị race condition setup
//
// Chạy:
//   docker run --rm -i --add-host=host.docker.internal:host-gateway `
//     -e BASE_URL=http://host.docker.internal:8080 `
//     -v ${PWD}/benchmark/k6:/scripts `
//     grafana/k6 run /scripts/01_auth.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

// Custom metrics
const loginSuccessRate    = new Rate('login_success_rate');
const registerSuccessRate = new Rate('register_success_rate');
const logoutSuccessRate   = new Rate('logout_success_rate');
const loginDuration       = new Trend('login_duration_ms');
const registerDuration    = new Trend('register_duration_ms');
const getMeDuration       = new Trend('get_me_duration_ms');
const totalLogins         = new Counter('total_logins');

export const options = {
  thresholds: {
    http_req_duration:    ['p(95)<2000', 'p(99)<5000'],
    http_req_failed:      ['rate<0.05'],
    login_success_rate:   ['rate>0.90'],
    register_success_rate:['rate>0.90'],
  },

  scenarios: {
    // Kịch bản 1: Full auth flow (register → login → me → logout)
    // Ramp lên 30 VUs để test load vừa phải trước
    full_auth_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 10 },   // Warm-up
        { duration: '30s', target: 30 },   // Sustained: 30 concurrent users
        { duration: '15s', target: 0 },    // Cool-down
      ],
      tags: { scenario: 'full_auth_flow' },
    },

    // Kịch bản 2: Chỉ test login với rate cố định (5 req/s)
    // Dùng accounts đã tạo sẵn trong setup
    login_only: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      startTime: '5s',
      tags: { scenario: 'login_only' },
      exec: 'loginOnlyFlow',
    },
  },
};

// ─── Setup: tạo 5 accounts dùng cho login_only ──────────────
export function setup() {
  console.log('🔧 Setup: Creating user pool...');
  const pool = [];

  for (let i = 0; i < 5; i++) {
    const email    = randomEmail();
    const password = 'BenchPass@123';

    let attempts = 0;
    let res;
    // Retry tối đa 3 lần nếu server chưa ready
    while (attempts < 3) {
      res = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({ email, password, name: `BenchUser${i}` }),
        { headers: jsonHeaders(), timeout: '10s' },
      );
      if (res.status === 200 || res.status === 201) break;
      attempts++;
      sleep(1);
    }

    const body = parseBody(res);
    if (res.status === 200 || res.status === 201) {
      pool.push({ email, password });
      console.log(`✅ Setup: Created user ${i+1}/5 → ${email}`);
    } else {
      console.warn(`⚠️  Setup: Failed user ${i+1}/5 (${res.status}): ${res.body?.slice(0,80)}`);
    }
    sleep(0.5); // Không spam setup
  }

  if (pool.length === 0) {
    console.error('❌ Setup: No users created. Tests will use fresh accounts each iteration.');
    // Trả về 1 user giả → loginOnlyFlow sẽ tự tạo account mới
    return { pool: [] };
  }

  console.log(`✅ Setup complete: ${pool.length} users ready`);
  return { pool };
}

// ─── Default: Full auth cycle (register → login → me → logout) ──
export default function (_data) {
  const email    = randomEmail();
  const password = 'BenchPass@123';

  group('Auth: Full Cycle', () => {

    // 1. REGISTER
    const t0 = Date.now();
    const regRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ email, password, name: `BU_${__VU}_${__ITER}` }),
      { headers: jsonHeaders(), tags: { name: 'POST /auth/register' } },
    );
    registerDuration.add(Date.now() - t0);

    const regOk = check(regRes, {
      'register: status 2xx':       (r) => r.status === 200 || r.status === 201,
      'register: has accessToken':  (r) => !!parseBody(r)?.accessToken,
    });
    registerSuccessRate.add(regOk);

    if (!regOk) {
      console.warn(`Register failed: ${regRes.status} ${regRes.body?.slice(0, 100)}`);
      sleep(1);
      return;
    }

    // 2. LOGIN với account vừa tạo
    const t1 = Date.now();
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: jsonHeaders(), tags: { name: 'POST /auth/login' } },
    );
    loginDuration.add(Date.now() - t1);
    totalLogins.add(1);

    const loginBody = parseBody(loginRes);
    const loginOk = check(loginRes, {
      'login: status 2xx':          (r) => r.status === 200 || r.status === 201,
      'login: has accessToken':     (r) => !!loginBody?.accessToken,
      'login: response < 1000ms':   (r) => r.timings.duration < 1000,
    });
    loginSuccessRate.add(loginOk);

    if (!loginOk) {
      console.warn(`Login failed: ${loginRes.status} ${loginRes.body?.slice(0, 100)}`);
      sleep(1);
      return;
    }

    const token = loginBody.accessToken;

    // 3. GET /auth/me (kiểm tra JWT + Redis blacklist)
    const t2 = Date.now();
    const meRes = http.get(
      `${BASE_URL}/auth/me`,
      { headers: jsonHeaders(token), tags: { name: 'GET /auth/me' } },
    );
    getMeDuration.add(Date.now() - t2);

    check(meRes, {
      'auth/me: status 200':      (r) => r.status === 200,
      'auth/me: has id':          (r) => !!parseBody(r)?.id,
      'auth/me: response < 200ms':(r) => r.timings.duration < 200,
    });

    // 4. LOGOUT (đưa token vào Redis blacklist)
    const logoutRes = http.post(
      `${BASE_URL}/auth/logout`,
      null,
      { headers: jsonHeaders(token), tags: { name: 'POST /auth/logout' } },
    );

    const logoutOk = check(logoutRes, {
      'logout: status 2xx':   (r) => r.status === 200 || r.status === 201,
    });
    logoutSuccessRate.add(logoutOk);

    // 5. VERIFY blacklist: dùng lại token sau logout → phải bị 401
    const blacklistRes = http.get(
      `${BASE_URL}/auth/me`,
      { headers: jsonHeaders(token), tags: { name: 'GET /auth/me (blacklisted)' } },
    );

    check(blacklistRes, {
      'blacklist: token rejected (401)': (r) => r.status === 401,
    });
  });

  sleep(0.3);
}

// ─── Login-only flow: login với pre-created accounts ────────
export function loginOnlyFlow(data) {
  let email, password;

  if (data.pool && data.pool.length > 0) {
    // Dùng account từ pool (round-robin)
    const user = data.pool[__VU % data.pool.length];
    email    = user.email;
    password = user.password;
  } else {
    // Fallback: tạo account mới trong iteration
    email    = randomEmail();
    password = 'BenchPass@123';
    http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ email, password, name: 'FallbackUser' }),
      { headers: jsonHeaders() },
    );
  }

  const t = Date.now();
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), tags: { name: 'POST /auth/login (login-only)' } },
  );
  loginDuration.add(Date.now() - t);
  totalLogins.add(1);

  const body = parseBody(res);
  const ok = check(res, {
    'login-only: status 2xx':       (r) => r.status === 200 || r.status === 201,
    'login-only: has accessToken':  (r) => !!body?.accessToken,
    'login-only: < 500ms':          (r) => r.timings.duration < 500,
  });
  loginSuccessRate.add(ok);

  if (!ok) {
    // Chỉ log nếu thực sự fail (không có accessToken)
    if (!body?.accessToken) {
      console.warn(`[login-only] REAL FAIL ${res.status}: ${res.body?.slice(0, 80)}`);
    }
  }

  sleep(0.2);
}

export function teardown(_data) {
  console.log('\n📊 Auth Benchmark v2 complete.');
}
