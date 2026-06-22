// ============================================================
// XConnect Benchmark — 02: Chat REST API
// ============================================================
// Kiểm tra: List conversations, Get messages, Send message via HTTP
// Mô phỏng: 50 users đọc tin nhắn đồng thời (read-heavy workload)
//
// Chạy:
//   docker run --rm -i grafana/k6 run - < benchmark/k6/02_chat_api.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const conversationFetchSuccess = new Rate('conversation_fetch_success');
const messageListDuration = new Trend('message_list_duration_ms');
const conversationListDuration = new Trend('conversation_list_duration_ms');

export const options = {
  thresholds: {
    // Chat API phải nhẹ — target < 300ms p95
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
    conversation_fetch_success: ['rate>0.99'],
    message_list_duration_ms: ['p(95)<400'],
  },

  scenarios: {
    // Read-heavy: Nhiều user xem danh sách conversation & tin nhắn
    chat_read_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '40s', target: 50 },  // Sustained: 50 concurrent readers
        { duration: '10s', target: 80 },  // Peak: 80 concurrent
        { duration: '10s', target: 0 },
      ],
      tags: { scenario: 'chat_read' },
    },

    // Write: Tạo conversation mới
    chat_write_moderate: {
      executor: 'constant-arrival-rate',
      rate: 5,            // 5 conversation creates per second
      timeUnit: '1s',
      duration: '40s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      startTime: '10s',  // Bắt đầu sau read warm-up
      tags: { scenario: 'chat_write' },
      exec: 'createConversationFlow',
    },
  },
};

// ─── Setup: Tạo 2 users + 1 conversation ────────────────────
export function setup() {
  const email1 = randomEmail();
  const email2 = randomEmail();
  const pass = 'BenchPass@123';

  // Register user 1
  const r1 = http.post(`${BASE_URL}/auth/register`,
    JSON.stringify({ email: email1, password: pass, name: 'BenchUser1' }),
    { headers: jsonHeaders() }
  );
  const body1 = parseBody(r1);

  // Register user 2
  const r2 = http.post(`${BASE_URL}/auth/register`,
    JSON.stringify({ email: email2, password: pass, name: 'BenchUser2' }),
    { headers: jsonHeaders() }
  );
  const body2 = parseBody(r2);

  if (!body1?.accessToken || !body2?.accessToken) {
    console.error('❌ Setup failed: Could not create test users');
    return {};
  }

  const user1Id = body1.user?.id;
  const user2Id = body2.user?.id;
  const token1 = body1.accessToken;

  // Tạo conversation giữa 2 users
  const convRes = http.post(`${BASE_URL}/chat/conversations`,
    JSON.stringify({ targetUserId: user2Id }),
    { headers: jsonHeaders(token1) }
  );
  const convBody = parseBody(convRes);
  const conversationId = convBody?.id;

  // Seed một vài tin nhắn (dùng socket trong thực tế, ở đây giả lập)
  // => Dùng HTTP save nếu có endpoint, hoặc để conversation rỗng

  console.log(`✅ Setup: user1=${user1Id}, user2=${user2Id}, conv=${conversationId}`);

  return {
    token1,
    token2: body2.accessToken,
    user1Id,
    user2Id,
    conversationId,
  };
}

// ─── Default: Read flow ──────────────────────────────────────
export default function (data) {
  if (!data.token1) {
    console.warn('No token available, skipping');
    sleep(1);
    return;
  }

  // Token rotation: Mỗi VU random dùng token1 hoặc token2
  const token = Math.random() > 0.5 ? data.token1 : data.token2;

  group('Chat: Read Flow', () => {
    // 1. Lấy danh sách conversations
    const t0 = Date.now();
    const convListRes = http.get(`${BASE_URL}/chat/conversations`, {
      headers: jsonHeaders(token),
      tags: { name: 'GET /chat/conversations' },
    });
    conversationListDuration.add(Date.now() - t0);

    const listOk = check(convListRes, {
      'conversations: status 200': (r) => r.status === 200,
      'conversations: is array': (r) => Array.isArray(parseBody(r)),
      'conversations: response < 200ms': (r) => r.timings.duration < 200,
    });
    conversationFetchSuccess.add(listOk);

    // 2. Nếu có conversation, lấy messages
    if (data.conversationId) {
      const t1 = Date.now();
      const msgRes = http.get(
        `${BASE_URL}/chat/conversations/${data.conversationId}/messages`,
        { headers: jsonHeaders(token), tags: { name: 'GET /chat/messages' } }
      );
      messageListDuration.add(Date.now() - t1);

      check(msgRes, {
        'messages: status 200': (r) => r.status === 200,
        'messages: is array': (r) => Array.isArray(parseBody(r)),
        'messages: response < 300ms': (r) => r.timings.duration < 300,
      });
    }
  });

  sleep(0.2); // Think time ngắn — simulates rapid polling
}

// ─── Create conversation flow ────────────────────────────────
export function createConversationFlow(data) {
  if (!data.token1 || !data.user2Id) {
    sleep(1);
    return;
  }

  const res = http.post(
    `${BASE_URL}/chat/conversations`,
    JSON.stringify({ targetUserId: data.user2Id }),
    { headers: jsonHeaders(data.token1), tags: { name: 'POST /chat/conversations' } }
  );

  check(res, {
    'create conversation: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'create conversation: has id': (r) => !!parseBody(r)?.id,
  });

  sleep(0.5);
}

export function teardown(data) {
  console.log(`\n📊 Chat API Benchmark complete.`);
}
