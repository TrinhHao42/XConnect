// ============================================================
// XConnect Benchmark — 01a: Auth Full Cycle (Register→Login→Me→Logout)
// ============================================================
// Đo: Toàn bộ auth flow dưới concurrent load
// Kết quả lần trước (30 VUs):
//   - register avg: ~2140ms (bcrypt CPU-bound)
//   - login avg: ~900ms
//   - auth/me avg: ~306ms
//   - blacklist: 100% working
//
// Chạy:
//   docker run --rm -i --add-host=host.docker.internal:host-gateway `
//     -e BASE_URL=http://host.docker.internal:8080 `
//     -v ${PWD}/benchmark/k6:/scripts `
//     grafana/k6 run /scripts/01a_auth_full_cycle.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const registerOkRate  = new Rate('register_ok');
const loginOkRate     = new Rate('login_ok');
const logoutOkRate    = new Rate('logout_ok');
const blacklistOkRate = new Rate('blacklist_ok');
const registerMs      = new Trend('register_ms', true);
const loginMs         = new Trend('login_ms', true);
const getMeMs         = new Trend('get_me_ms', true);

export const options = {
  thresholds: {
    http_req_duration:    ['p(95)<5000'],
    http_req_failed:      ['rate<0.10'],
    register_ok:          ['rate>0.90'],
    login_ok:             ['rate>0.90'],
    blacklist_ok:         ['rate>0.99'],
  },

  scenarios: {
    auth_full_cycle: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5  },
        { duration: '20s', target: 15 },  // 15 concurrent
        { duration: '20s', target: 30 },  // 30 concurrent (stress)
        { duration: '10s', target: 0  },
      ],
    },
  },
};

export default function () {
  const email    = randomEmail();
  const password = 'BenchPass@123';

  // 1. REGISTER
  const t0 = Date.now();
  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password, name: `BU_${__VU}_${__ITER}` }),
    { headers: jsonHeaders(), tags: { name: 'POST /auth/register' } },
  );
  registerMs.add(Date.now() - t0);

  const regOk = check(regRes, {
    'register: 2xx':          (r) => r.status === 200 || r.status === 201,
    'register: has token':    (r) => !!parseBody(r)?.accessToken,
  });
  registerOkRate.add(regOk);

  if (!regOk) {
    sleep(1);
    return;
  }

  // 2. LOGIN
  const t1 = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), tags: { name: 'POST /auth/login' } },
  );
  loginMs.add(Date.now() - t1);

  const loginBody = parseBody(loginRes);
  const loginOk = check(loginRes, {
    'login: 2xx':        (r) => r.status === 200 || r.status === 201,
    'login: has token':  (r) => !!loginBody?.accessToken,
  });
  loginOkRate.add(loginOk);

  if (!loginOk) { sleep(0.5); return; }
  const token = loginBody.accessToken;

  // 3. GET /auth/me
  const t2 = Date.now();
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(token),
    tags: { name: 'GET /auth/me' },
  });
  getMeMs.add(Date.now() - t2);

  check(meRes, {
    'auth/me: 200':     (r) => r.status === 200,
    'auth/me: has id':  (r) => !!parseBody(r)?.id,
  });

  // 4. LOGOUT
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, {
    headers: jsonHeaders(token),
    tags: { name: 'POST /auth/logout' },
  });
  logoutOkRate.add(check(logoutRes, { 'logout: 2xx': (r) => r.status === 200 || r.status === 201 }));

  // 5. VERIFY BLACKLIST
  sleep(0.05); // Chờ Redis ghi xong
  const blackRes = http.get(`${BASE_URL}/auth/me`, {
    headers: jsonHeaders(token),
    tags: { name: 'GET /auth/me (blacklisted)' },
  });
  const blackOk = check(blackRes, {
    'blacklist: 401 after logout': (r) => r.status === 401,
  });
  blacklistOkRate.add(blackOk);

  sleep(0.2);
}
