// ============================================================
// XConnect Benchmark — 01b: Login Performance (Isolated)
// ============================================================
// Đo: Tốc độ login thuần túy với pre-created accounts
// KHÔNG chạy đồng thời với 01a (tránh bcrypt saturation)
//
// Chạy:
//   docker run --rm -i --add-host=host.docker.internal:host-gateway `
//     -e BASE_URL=http://host.docker.internal:8080 `
//     -v ${PWD}/benchmark/k6:/scripts `
//     grafana/k6 run /scripts/01b_login_performance.js
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const loginOkRate    = new Rate('login_ok');
const loginMs        = new Trend('login_ms', true);
const getMeMs        = new Trend('get_me_ms', true);
const blacklistMs    = new Trend('blacklist_check_ms', true);
const totalLogins    = new Counter('total_logins');

export const options = {
  thresholds: {
    login_ok:              ['rate>0.95'],
    login_ms:              ['p(95)<1000', 'p(99)<2000'],
    get_me_ms:             ['p(95)<300'],
    blacklist_check_ms:    ['p(95)<300'],
    http_req_failed:       ['rate<0.05'],
  },

  scenarios: {
    // Warm-up: 5 req/s constant (đo baseline)
    login_baseline: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 15,
      tags: { scenario: 'baseline_5rps' },
    },

    // Moderate: 20 req/s (typical traffic)
    login_moderate: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 30,
      startTime: '25s',
      tags: { scenario: 'moderate_20rps' },
    },

    // Peak: 50 req/s
    login_peak: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 60,
      maxVUs: 100,
      startTime: '50s',
      tags: { scenario: 'peak_50rps' },
    },
  },
};

// Pool 20 accounts tạo sẵn
export function setup() {
  console.log('🔧 Creating login pool (20 accounts)...');
  const pool = [];

  for (let i = 0; i < 20; i++) {
    const email    = randomEmail();
    const password = 'BenchPass@123';

    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = http.post(`${BASE_URL}/auth/register`,
        JSON.stringify({ email, password, name: `LP_${i}_${Date.now()}_${Math.floor(Math.random() * 10000)}` }),
        { headers: jsonHeaders(), timeout: '15s' }
      );
      if (res.status === 200 || res.status === 201) break;
      sleep(1);
    }

    const body = parseBody(res);
    if (body?.accessToken) {
      pool.push({ email, password });
      if (i % 5 === 0) console.log(`  Created ${i+1}/20...`);
    }
    sleep(0.3); // Không spam setup
  }

  console.log(`✅ Pool: ${pool.length}/20 accounts ready`);
  return { pool };
}

export default function (data) {
  if (!data.pool || data.pool.length === 0) { sleep(1); return; }

  // Round-robin qua pool, tránh cùng account bị lock
  const user = data.pool[(__VU + __ITER) % data.pool.length];

  // LOGIN
  const t1 = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: jsonHeaders(), tags: { name: 'POST /auth/login' } },
  );
  loginMs.add(Date.now() - t1);
  totalLogins.add(1);

  const loginBody = parseBody(loginRes);
  const loginOk = check(loginRes, {
    'login: 2xx':          (r) => r.status === 200 || r.status === 201,
    'login: has token':    (r) => !!loginBody?.accessToken,
  });
  loginOkRate.add(loginOk);

  if (!loginOk) { sleep(0.2); return; }
  const token = loginBody.accessToken;

  // GET /auth/me (Redis blacklist check)
  const t2 = Date.now();
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(token),
    tags: { name: 'GET /auth/me' },
  });
  getMeMs.add(Date.now() - t2);

  check(meRes, {
    'auth/me: 200':    (r) => r.status === 200,
    'auth/me: < 200ms':(r) => r.timings.duration < 200,
  });

  // BLACKLIST: Logout → reuse token → measure blacklist check speed
  http.post(`${BASE_URL}/auth/logout`, null, { headers: jsonHeaders(token) });

  sleep(0.05);
  const t3 = Date.now();
  const reuseRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(token),
    tags: { name: 'GET /auth/me (blacklisted)' },
  });
  blacklistMs.add(Date.now() - t3);

  check(reuseRes, {
    'blacklist: 401': (r) => r.status === 401,
  });

  sleep(0.1);
}

export function teardown(data) {
  console.log(`\n✅ Login Performance Benchmark complete`);
  console.log(`   Pool used: ${data.pool?.length || 0} accounts`);
}
