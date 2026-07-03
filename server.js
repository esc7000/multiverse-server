const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 현재 접속 중인 사람들
const players = {};

io.on("connection", (socket) => {
  console.log("접속:", socket.id);

  // 유저가 입장했을 때
  socket.on("join", (player) => {
    players[socket.id] = {
      id: socket.id,
      name: player.name || "익명",
      color: player.color || "#7F77DD",
      scene: player.scene || "office",
      px: player.px || 0,
      py: player.py || 0,
      tx: player.tx || 0,
      ty: player.ty || 0,
      dir: player.dir || "down",
      face: player.face || "happy",
      hat: player.hat || null,
      sitting: false,
      bubble: null
    };

    io.emit("players", players);
  });

  // 유저가 움직였을 때
  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id] = {
      ...players[socket.id],
      ...data
    };

    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  // 채팅을 보냈을 때
  socket.on("chat", (message) => {
    if (!players[socket.id]) return;

    const text = String(message || "").trim();
    if (!text) return;

    players[socket.id].bubble = {
      text,
      time: Date.now()
    };

    io.emit("chat", {
      id: socket.id,
      name: players[socket.id].name,
      text
    });

    io.emit("playerMoved", players[socket.id]);

    // 3초 뒤 말풍선 지우기
    setTimeout(() => {
      if (players[socket.id]) {
        players[socket.id].bubble = null;
        io.emit("playerMoved", players[socket.id]);
      }
    }, 3000);
  });

  // 유저가 나갔을 때
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
    console.log("퇴장:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Multiverse server is running!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: ${PORT}`);
});
