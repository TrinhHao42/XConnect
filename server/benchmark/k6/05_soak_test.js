import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders, randomEmail } from './config.js';

export const options = {
  scenarios: {
    soak_test: {
      executor: 'constant-arrival-rate',
      rate: 15,          // 15 req/s
      timeUnit: '1s',
      duration: '2h',    // 2 hours soak time
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
};

export default function () {
  // Mixture of GET and POST
  const rand = Math.random();
  if (rand < 0.7) {
    // Light read
    const r = http.get(`${BASE_URL}/users/search?keyword=soak`, { headers: jsonHeaders() });
    check(r, { 'status is 200/401': (res) => res.status === 200 || res.status === 401 });
  } else {
    // Light write
    const r = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      email: randomEmail(),
      password: 'SoakPassword@123',
      name: 'SoakUser'
    }), { headers: jsonHeaders() });
    check(r, { 'status is 200/201': (res) => res.status === 200 || res.status === 201 });
  }
}
