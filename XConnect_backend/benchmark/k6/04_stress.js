// ============================================================
// XConnect Benchmark — 04: Stress Test & Breaking Point
// ============================================================
// Mục tiêu: Tìm điểm giới hạn (breaking point) của hệ thống
// Test: Tăng dần load cho đến khi error rate vượt threshold
//
// ⚠️  Test này sẽ tạo TẢI RẤT LỚN — chỉ chạy khi server
//     đang trong môi trường test, KHÔNG phải production!
//
// Chạy:
//   docker run --rm -i grafana/k6 run - < benchmark/k6/04_stress.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const errorRate = new Rate('error_rate');
const successfulRequests = new Counter('successful_requests');
const p99Duration = new Trend('p99_duration_ms');

export const options = {
  // Stress test: KHÔNG đặt threshold cứng — muốn quan sát hệ thống suy giảm
  thresholds: {
    // Cảnh báo khi error rate vượt 5% (không abort)
    error_rate: [{ threshold: 'rate<0.05', abortOnFail: false }],
    // Abort nếu p99 vượt 5s (tránh test chạy quá lâu vô ích)
    http_req_duration: [{ threshold: 'p(99)<5000', abortOnFail: true }],
  },

  scenarios: {
    stress_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 10,       // Bắt đầu 10 req/s
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 10  },  // Warm-up
        { duration: '30s', target: 50  },  // Light load
        { duration: '30s', target: 100 },  // Moderate
        { duration: '30s', target: 200 },  // Heavy
        { duration: '30s', target: 300 },  // Stress
        { duration: '30s', target: 400 },  // Very heavy
        { duration: '30s', target: 0   },  // Recovery
      ],
    },
  },
};

// ─── Pool 10 pre-created accounts ────────────────────────────
let userPool = [];

export function setup() {
  console.log('🚀 Creating user pool for stress test...');
  const pool = [];

  for (let i = 0; i < 10; i++) {
    const email = randomEmail();
    const res = http.post(`${BASE_URL}/auth/register`,
      JSON.stringify({ email, password: 'BenchPass@123', name: `StressUser${i}` }),
      { headers: jsonHeaders() }
    );
    const body = parseBody(res);
    if (body?.accessToken) {
      pool.push({ token: body.accessToken, userId: body.user?.id });
    }
    sleep(0.1); // Không spam setup quá nhanh
  }

  console.log(`✅ Pool ready: ${pool.length} users`);
  return { pool };
}

// ─── Main: Mixed workload (phản ánh traffic thực) ────────────
export default function (data) {
  if (!data.pool || data.pool.length === 0) {
    sleep(1);
    return;
  }

  const user = data.pool[Math.floor(Math.random() * data.pool.length)];
  const token = user.token;

  // Phân phối workload: 60% read, 25% auth, 15% write
  const rand = Math.random();
  let res;

  if (rand < 0.60) {
    // ── Read: Lấy conversations (60%) ──────────────
    group('stress: read conversations', () => {
      res = http.get(`${BASE_URL}/chat/conversations`, {
        headers: jsonHeaders(token),
        tags: { name: 'stress_read_conversations' },
        timeout: '10s',
      });

      const ok = check(res, {
        'stress read: status ok': (r) => r.status === 200,
        'stress read: not timeout': (r) => r.timings.duration < 3000,
      });

      errorRate.add(!ok);
      if (ok) successfulRequests.add(1);
      p99Duration.add(res.timings.duration);
    });

  } else if (rand < 0.85) {
    // ── Auth: Get me (25%) ─────────────────────────
    group('stress: auth me', () => {
      res = http.get(`${BASE_URL}/auth/me`, {
        headers: jsonHeaders(token),
        tags: { name: 'stress_auth_me' },
        timeout: '5s',
      });

      const ok = check(res, {
        'stress auth/me: status ok': (r) => r.status === 200,
      });

      errorRate.add(!ok);
      if (ok) successfulRequests.add(1);
    });

  } else {
    // ── Write: Tạo conversation (15%) ─────────────
    group('stress: create conversation', () => {
      // Tạo self-conversation (đảm bảo không lỗi business logic)
      res = http.post(`${BASE_URL}/chat/conversations`,
        JSON.stringify({ targetUserId: user.userId }),
        {
          headers: jsonHeaders(token),
          tags: { name: 'stress_create_conversation' },
          timeout: '10s',
        }
      );

      const ok = check(res, {
        'stress write: status ok': (r) => r.status === 200 || r.status === 201,
      });

      errorRate.add(!ok);
      if (ok) successfulRequests.add(1);
    });
  }

  // Không sleep trong stress test để maximize throughput
  // Nhưng thêm tiny pause tránh CPU spike ảo
  sleep(0.01);
}

export function teardown(data) {
  console.log('\n🏁 Stress Test Complete');
  console.log('📈 Check the results above for breaking point analysis');
  console.log('   Look for: when error_rate spikes & p99 latency degrades significantly');
}
