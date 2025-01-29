const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Store active games
const games = new Map();

// Generate a random game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Broadcast to all clients in a room
function broadcast(room, message) {
  wss.clients.forEach((client) => {
    if (client.room === room && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "createGame":
        const gameCode = generateGameCode();
        const response = await axios.get(
          `https://api.unsplash.com/photos/random?client_id=RCBROw8eIDkFR_Dqztm9BDnRGXvVMhDK-7cEQygrCd4&count=${
            data.cardCount / 2
          }`
        );
        const images = response.data.map((photo) => photo.urls.small);
        const cards = [...images, ...images].sort(() => Math.random() - 0.5);

        games.set(gameCode, {
          cards,
          players: [ws],
          flipped: [],
        });

        ws.room = gameCode;
        ws.send(
          JSON.stringify({
            type: "gameCreated",
            gameCode,
            cards,
          })
        );
        break;

      case "joinGame":
        const game = games.get(data.gameCode);
        if (game) {
          game.players.push(ws);
          ws.room = data.gameCode;
          broadcast(data.gameCode, {
            type: "playerJoined",
            players: game.players.length,
          });
        }
        break;

      case "flipCard":
        const currentGame = games.get(data.gameCode);
        if (currentGame) {
          currentGame.flipped.push(data.index);
          broadcast(data.gameCode, {
            type: "cardFlipped",
            index: data.index,
            flipped: currentGame.flipped,
          });

          if (currentGame.flipped.length === 2) {
            const [first, second] = currentGame.flipped;
            if (currentGame.cards[first] === currentGame.cards[second]) {
              broadcast(data.gameCode, {
                type: "matchFound",
                first,
                second,
              });
            } else {
              setTimeout(() => {
                broadcast(data.gameCode, {
                  type: "resetCards",
                  first,
                  second,
                });
              }, 1000);
            }
            currentGame.flipped = [];
          }
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
