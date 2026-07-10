const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('멀티버스 서버 작동중!');
});

const wss = new WebSocket.Server({ server });
const players = new Map(); // id -> {ws, data}

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 9);
  console.log(`접속: ${id} (현재 ${players.size+1}명)`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      msg.id = id;

      if (msg.type === 'join') {
        const playerData = {
          id, name: msg.name, color: msg.color,
          scene: msg.scene, px: msg.px, py: msg.py,
          dir: msg.dir, face: msg.face, hat: msg.hat,
          sitting: msg.sitting,
        };
        players.set(id, { ws, data: playerData });

        // 내 ID + 기존 유저 목록 전송
        ws.send(JSON.stringify({
          type: 'init',
          myId: id,
          players: [...players.values()].map(p => p.data).filter(p => p.id !== id)
        }));

        // 다른 유저들에게 새 유저 알림
        broadcast(ws, { type: 'join', player: playerData });

      } else if (msg.type === 'move') {
        const p = players.get(id);
        if (p) {
          p.data.px = msg.px; p.data.py = msg.py;
          p.data.dir = msg.dir; p.data.sitting = msg.sitting;
          p.data.scene = msg.scene;
          broadcast(ws, { type: 'move', id, px: msg.px, py: msg.py, dir: msg.dir, sitting: msg.sitting, scene: msg.scene });
        }
      } else if (msg.type === 'scene') {
        const p = players.get(id);
        if (p) { p.data.scene = msg.scene; broadcast(ws, { type: 'scene', id, scene: msg.scene }); }
      } else if (msg.type === 'face') {
        const p = players.get(id);
        if (p) { p.data.face = msg.face; broadcast(ws, { type: 'face', id, face: msg.face }); }
      } else if (msg.type === 'hat') {
        const p = players.get(id);
        if (p) { p.data.hat = msg.hat; broadcast(ws, { type: 'hat', id, hat: msg.hat }); }
      } else if (msg.type === 'bubble') {
        broadcast(ws, { type: 'bubble', id, text: msg.text });
      }
    } catch(e) { console.error('에러:', e); }
  });

  ws.on('close', () => {
    console.log(`퇴장: ${id}`);
    players.delete(id);
    broadcast(ws, { type: 'leave', id });
  });

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// 연결 유지
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);

function broadcast(senderWs, data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`서버 시작! 포트 ${PORT}`));
