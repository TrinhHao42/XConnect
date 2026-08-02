import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, jsonHeaders, parseBody, randomEmail, randomString } from './config.js';

const connectionHandshakeLatency = new Trend('ws_handshake_latency_ms');
const messageDeliveryLatency = new Trend('ws_message_delivery_latency_ms');
const connectionSuccess = new Rate('ws_connection_success');

export const options = {
  setupTimeout: '3m',
  scenarios: {
    chat_ws_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 50 },  // Ramp up to 50 VUs
        { duration: '2m', target: 50 },   // Stay at 50 VUs for 2 mins
        { duration: '10s', target: 0 },   // Ramp down
      ],
    },
  },
};

export function setup() {
  const users = [];
  const count = 15; // Pair count
  
  for (let i = 0; i < count; i++) {
    const email1 = randomEmail();
    const email2 = randomEmail();
    const pass = 'BenchPass@123';

    const r1 = http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email: email1, password: pass, name: `UserA_${i}` }), { headers: jsonHeaders() });
    const r2 = http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email: email2, password: pass, name: `UserB_${i}` }), { headers: jsonHeaders() });

    const b1 = parseBody(r1);
    const b2 = parseBody(r2);

    if (b1?.accessToken && b2?.accessToken) {
      const convRes = http.post(`${BASE_URL}/chat/conversations`, JSON.stringify({ targetUserId: b2.user.id }), { headers: jsonHeaders(b1.accessToken) });
      const convBody = parseBody(convRes);

      users.push({
        token1: b1.accessToken,
        token2: b2.accessToken,
        conversationId: convBody?.id
      });
    }
  }

  console.log(`✅ Setup: Created ${users.length} user pairs & conversations`);
  return { users };
}

export default function (data) {
  if (!data.users || data.users.length === 0) return;
  
  // Pick a pair based on VU id
  const pairIndex = (__VU - 1) % data.users.length;
  const pair = data.users[pairIndex];
  
  const wsUrl = BASE_URL.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';
  
  const params = {
    headers: { Authorization: `Bearer ${pair.token1}` }
  };

  const t0 = Date.now();
  
  const res = ws.connect(wsUrl, params, function (socket) {
    let connected = false;
    let pingInterval;
    let messageTracker = {}; // track send time
    
    socket.on('open', function () {
      connectionHandshakeLatency.add(Date.now() - t0);
      connectionSuccess.add(1);
      connected = true;
    });

    socket.on('message', function (msg) {
      // Socket.io parsing
      if (msg === '2') {
        // Ping, reply with pong
        socket.send('3');
        return;
      }
      
      if (msg.startsWith('0')) {
        // Handshake packet (EIO)
        // Send connect packet (Socket.io protocol v4)
        const authPacket = `40{"token":"${pair.token1}"}`;
        socket.send(authPacket);
        
        // Start pinging
        pingInterval = setInterval(() => {
          socket.send('2');
        }, 20000);
      }
      
      if (msg.startsWith('40')) {
        // Connected to namespace
        socket.send(`42["joinRoom",{"conversationId":"${pair.conversationId}"}]`);
        
        // Start sending messages
        socket.setInterval(function () {
          const tempId = randomString(10);
          messageTracker[tempId] = Date.now();
          const payload = {
            conversationId: pair.conversationId,
            content: `Hello from VU ${__VU} at ${Date.now()}`,
            tempId: tempId
          };
          socket.send(`42["sendMessage",${JSON.stringify(payload)}]`);
        }, 3000); // send every 3s
      }
      
      if (msg.startsWith('42')) {
        // Event packet
        const eventDataStr = msg.substring(2);
        try {
          const eventArray = JSON.parse(eventDataStr);
          const eventName = eventArray[0];
          const payload = eventArray[1];
          
          if (eventName === 'newMessage' && payload.tempId) {
            const sendTime = messageTracker[payload.tempId];
            if (sendTime) {
              messageDeliveryLatency.add(Date.now() - sendTime);
              delete messageTracker[payload.tempId];
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    });

    socket.on('close', function () {
      if (pingInterval) clearInterval(pingInterval);
    });

    socket.on('error', function (e) {
      if (e.error() != 'websocket: close sent') {
        console.log('An unexpected error occurred: ', e.error());
      }
      if (!connected) connectionSuccess.add(0);
    });

    // Close after scenario time
    socket.setTimeout(function () {
      socket.close();
    }, 150000); // 2.5 minutes max
  });
}

export function teardown(data) {
  console.log(`\n📊 WS Chat API Benchmark complete.`);
}
