const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store active games
const games = new Map();

// Generate a random game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Fetch images from an API (e.g., Unsplash)
async function fetchImages(count) {
  const response = await axios.get(
    `https://api.unsplash.com/photos/random?count=${count}&client_id=YOUR_UNSPLASH_ACCESS_KEY`
  );
  return response.data.map((photo) => photo.urls.small);
}

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Create a new game
  socket.on("createGame", async ({ cardSet, cardCount }) => {
    const gameCode = generateGameCode();
    const images = await fetchImages(cardCount / 2); // Fetch images for pairs
    const cards = [...images, ...images].sort(() => Math.random() - 0.5); // Shuffle cards

    games.set(gameCode, { cards, players: [socket.id], flipped: [] });
    socket.join(gameCode);
    socket.emit("gameCreated", { gameCode, cards });
  });

  // Join an existing game
  socket.on("joinGame", ({ gameCode }) => {
    const game = games.get(gameCode);
    if (game) {
      game.players.push(socket.id);
      socket.join(gameCode);
      io.to(gameCode).emit("playerJoined", game.players);
    } else {
      socket.emit("error", "Game not found");
    }
  });

  // Handle card flips
  socket.on("flipCard", ({ gameCode, index }) => {
    const game = games.get(gameCode);
    if (game) {
      game.flipped.push(index);
      io.to(gameCode).emit("cardFlipped", { index, flipped: game.flipped });

      // Check for a match
      if (game.flipped.length === 2) {
        const [first, second] = game.flipped;
        if (game.cards[first] === game.cards[second]) {
          io.to(gameCode).emit("matchFound", { first, second });
        } else {
          setTimeout(() => {
            io.to(gameCode).emit("resetCards", { first, second });
          }, 1000);
        }
        game.flipped = [];
      }
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Serve static files
app.use(express.static("public"));

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
