import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail, randomString } from './config.js';

const readSuccessRate = new Rate('db_read_success');
const writeSuccessRate = new Rate('db_write_success');
const readDuration = new Trend('db_read_duration_ms');
const writeDuration = new Trend('db_write_duration_ms');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    db_read_duration_ms: ['p(95)<300'],
    db_write_duration_ms: ['p(95)<500'],
  },
  scenarios: {
    db_heavy_load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 20, duration: '30s' },
        { target: 50, duration: '1m' }, // 50 req/s DB load
        { target: 0, duration: '20s' },
      ],
    },
  },
};

export function setup() {
  const users = [];
  // Register 10 users to search and add friends
  for (let i = 0; i < 10; i++) {
    const r = http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email: randomEmail(), password: 'Pass@123', name: `BenchDB_${i}` }), { headers: jsonHeaders() });
    const b = parseBody(r);
    if (b?.accessToken) {
      users.push({ token: b.accessToken, id: b.user.id });
    }
  }
  return { users };
}

export default function (data) {
  if (!data.users || data.users.length === 0) return;
  
  // Random token
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  const token = user.token;
  
  // 80% Read, 20% Write
  const rand = Math.random();
  
  if (rand < 0.8) {
    // READ
    const t0 = Date.now();
    const searchRes = http.get(`${BASE_URL}/users/search?keyword=BenchDB`, { headers: jsonHeaders(token) });
    readDuration.add(Date.now() - t0);
    
    const readOk = check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });
    readSuccessRate.add(readOk);
  } else {
    // WRITE (Update profile)
    const t0 = Date.now();
    // Assuming PUT /users/profile or similar exists, else just try hitting a POST route
    const randTargetId = data.users[Math.floor(Math.random() * data.users.length)].id;
    const writeRes = http.post(`${BASE_URL}/chat/conversations`, JSON.stringify({ targetUserId: randTargetId }), { headers: jsonHeaders(token) });
    writeDuration.add(Date.now() - t0);
    
    const writeOk = check(writeRes, {
      'write status 200/201': (r) => r.status === 200 || r.status === 201,
    });
    writeSuccessRate.add(writeOk);
  }
  
  sleep(0.5);
}
