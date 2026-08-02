// ============================================================
// XConnect Benchmark — 03: WebSocket (Socket.io) Connections
// ============================================================
// Kiểm tra: Kết nối đồng thời, gửi/nhận tin nhắn qua Socket,
//           Typing events, Online users broadcast
//
// ⚠️  k6 hỗ trợ Socket.io qua k6/experimental/websockets
//     File này dùng WebSocket protocol thô (Socket.io v4 có thể
//     handshake qua HTTP polling rồi upgrade lên WS)
//
// Chạy:
//   docker run --rm -i --add-host=host.docker.internal:host-gateway \
//     grafana/k6 run - < benchmark/k6/03_websocket.js
// ============================================================

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail } from './config.js';

const wsConnectSuccess = new Rate('ws_connect_success');
const wsMessageReceived = new Counter('ws_messages_received');
const wsConnectDuration = new Trend('ws_connect_duration_ms');
const wsMessageRoundtrip = new Trend('ws_message_roundtrip_ms');

// Socket.io v4 WS URL format
const WS_URL = (BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://'));

export const options = {
  thresholds: {
    ws_connect_success: ['rate>0.95'],        // 95%+ phải kết nối được
    ws_connect_duration_ms: ['p(95)<1000'],   // Kết nối < 1s
    ws_message_roundtrip_ms: ['p(95)<200'],   // Tin nhắn < 200ms RTT
    http_req_failed: ['rate<0.02'],
  },

  scenarios: {
    // Kịch bản 1: Concurrent connections ramp-up
    ws_concurrent_connections: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 50 },   // 50 concurrent WS connections
        { duration: '20s', target: 100 },  // Peak: 100 concurrent
        { duration: '10s', target: 0 },
      ],
    },
  },
};

// ─── Setup: Tạo users để lấy tokens ─────────────────────────
export function setup() {
  const users = [];
  // Tạo 5 user pool để VUs dùng chung (tránh tạo quá nhiều account)
  for (let i = 0; i < 5; i++) {
    const email = randomEmail();
    const res = http.post(`${BASE_URL}/auth/register`,
      JSON.stringify({ email, password: 'BenchPass@123', name: `WSUser${i}` }),
      { headers: jsonHeaders() }
    );
    const body = parseBody(res);
    if (body?.accessToken) {
      users.push({ token: body.accessToken, userId: body.user?.id, email });
    }
  }

  // Tạo 1 conversation giữa user 0 và user 1
  let conversationId = null;
  if (users.length >= 2) {
    const convRes = http.post(`${BASE_URL}/chat/conversations`,
      JSON.stringify({ targetUserId: users[1].userId }),
      { headers: jsonHeaders(users[0].token) }
    );
    conversationId = parseBody(convRes)?.id;
  }

  console.log(`✅ Setup: ${users.length} users created, conversationId=${conversationId}`);
  return { users, conversationId };
}

// ─── Main: WebSocket test ────────────────────────────────────
export default function (data) {
  if (!data.users || data.users.length === 0) {
    console.warn('No users in setup, skipping');
    sleep(1);
    return;
  }

  // Mỗi VU pick một user ngẫu nhiên từ pool
  const user = data.users[__VU % data.users.length];
  const token = user.token;
  const conversationId = data.conversationId;

  // ─── Socket.io handshake: Bước 1 — HTTP polling để lấy sid ─
  // Socket.io v4 bắt đầu bằng HTTP long-polling rồi upgrade lên WS
  const handshakeRes = http.get(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling&token=${token}`,
    { tags: { name: 'socketio_handshake' } }
  );

  // Lấy sid từ response (Socket.io trả về JSON sau prefix "0")
  let sid = null;
  try {
    // Socket.io response format: "0{...json...}"
    const body = handshakeRes.body;
    const jsonPart = body.startsWith('0') ? body.substring(1) : body;
    const parsed = JSON.parse(jsonPart.split('\n')[0].replace(/^\d+/, ''));
    sid = parsed?.sid;
  } catch (_) {
    // Fallback: Thử parse trực tiếp
  }

  const handshakeOk = check(handshakeRes, {
    'socketio handshake: status 200': (r) => r.status === 200,
  });

  // ─── Upgrade lên WebSocket ────────────────────────────────
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket${sid ? `&sid=${sid}` : ''}&token=${token}`;

  const connectStart = Date.now();

  const response = ws.connect(wsUrl, { tags: { name: 'ws_chat_connection' } }, function (socket) {
    const connected = Date.now();
    wsConnectDuration.add(connected - connectStart);

    let connectionEstablished = false;

    socket.on('open', () => {
      wsConnectSuccess.add(true);
      connectionEstablished = true;

      // Socket.io WS upgrade handshake
      socket.send('2probe');  // Probe
    });

    socket.on('message', (msg) => {
      wsMessageReceived.add(1);

      // Xử lý Socket.io protocol messages
      if (msg === '3probe') {
        // Upgrade confirmed
        socket.send('5');  // Confirm upgrade

        // Sau khi connected, join room (nếu có conversation)
        if (conversationId) {
          const joinMsg = JSON.stringify([
            'joinRoom',
            { conversationId }
          ]);
          socket.send(`42${joinMsg}`);  // Socket.io event format: 42[event, data]
        }

        // Simulate typing indicator
        setTimeout(() => {
          if (conversationId) {
            const typingMsg = JSON.stringify(['typing', { conversationId }]);
            socket.send(`42${typingMsg}`);
          }
        }, 500);

        // Simulate send message (nếu có conversation)
        if (conversationId) {
          const msgStart = Date.now();
          const sendMsg = JSON.stringify([
            'sendMessage',
            {
              conversationId,
              content: `Benchmark message from VU ${__VU} at ${Date.now()}`,
              tempId: `temp_${__VU}_${Date.now()}`,
            }
          ]);
          socket.send(`42${sendMsg}`);

          socket.on('message', (responseMsg) => {
            if (responseMsg.includes('messageStatusUpdate') || responseMsg.includes('newMessage')) {
              wsMessageRoundtrip.add(Date.now() - msgStart);
            }
          });
        }
      }

      // Heartbeat response
      if (msg === '2') {
        socket.send('3');  // Pong
      }
    });

    socket.on('error', (e) => {
      wsConnectSuccess.add(false);
      console.warn(`WS Error VU ${__VU}: ${e.error()}`);
    });

    socket.on('close', () => {
      if (!connectionEstablished) {
        wsConnectSuccess.add(false);
      }
    });

    // Giữ kết nối trong 5s để simulate real usage
    sleep(5);

    // Disconnect gracefully
    if (conversationId) {
      const stopTyping = JSON.stringify(['stopTyping', { conversationId }]);
      socket.send(`42${stopTyping}`);
    }

    socket.close();
  });

  check(response, {
    'ws session: completed': (r) => r && r.status === 101,
  });

  sleep(1);
}

export function teardown(data) {
  console.log(`\n📊 WebSocket Benchmark complete.`);
  console.log(`   Users tested: ${data.users?.length || 0}`);
}
