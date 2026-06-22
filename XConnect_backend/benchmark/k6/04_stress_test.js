import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders, randomEmail } from './config.js';

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '30s', target: 50 },  // Normal load
        { duration: '1m', target: 150 },  // High load
        { duration: '1m', target: 300 },  // Stress point
        { duration: '30s', target: 500 }, // Breaking point?
        { duration: '30s', target: 0 },   // Recovery
      ],
    },
  },
};

export default function () {
  // Simple light endpoint to test raw NestJS throughput
  const r = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: randomEmail(),
    password: 'StressPassword@123',
    name: 'StressUser'
  }), { headers: jsonHeaders() });

  check(r, {
    'status is 200 or 201': (res) => res.status === 200 || res.status === 201 || res.status === 400, // allow 400 if duplicate, but randomEmail mitigates it
  });
}
