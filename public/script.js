const socket = io("http://127.0.0.1:3001", {
  withCredentials: true,
  transports: ["polling", "websocket"],
});

const app = document.getElementById("app");
const menu = document.getElementById("menu");
const gameDiv = document.getElementById("game");
const createGameBtn = document.getElementById("createGame");
const joinGameBtn = document.getElementById("joinGame");
const gameCodeInput = document.getElementById("gameCode");

// Create a new game
createGameBtn.addEventListener("click", () => {
  const cardSet = "default"; // Allow user to choose card set
  const cardCount = 12; // Allow user to choose card count
  socket.emit("createGame", { cardSet, cardCount });
});

// Join an existing game
joinGameBtn.addEventListener("click", () => {
  const gameCode = gameCodeInput.value;
  if (gameCode) {
    socket.emit("joinGame", { gameCode });
  }
});

// Handle game creation
socket.on("gameCreated", ({ gameCode, cards }) => {
  menu.classList.add("hidden");
  gameDiv.classList.remove("hidden");
  renderCards(cards);
});

// Handle card flips
function renderCards(cards) {
  gameDiv.innerHTML = cards
    .map(
      (card, index) => `
        <div class="card bg-white p-4 rounded shadow cursor-pointer" data-index="${index}">
          <img src="${card}" class="w-24 h-24 hidden">
        </div>
      `
    )
    .join("");

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const index = card.dataset.index;
      socket.emit("flipCard", { gameCode: gameCodeInput.value, index });
    });
  });
}

// Handle card flip updates
socket.on("cardFlipped", ({ index, flipped }) => {
  const card = document.querySelector(`.card[data-index="${index}"]`);
  card.querySelector("img").classList.remove("hidden");
});

// Handle match found
socket.on("matchFound", ({ first, second }) => {
  document
    .querySelector(`.card[data-index="${first}"]`)
    .classList.add("opacity-50");
  document
    .querySelector(`.card[data-index="${second}"]`)
    .classList.add("opacity-50");
});

// Handle reset cards
socket.on("resetCards", ({ first, second }) => {
  document
    .querySelector(`.card[data-index="${first}"]`)
    .querySelector("img")
    .classList.add("hidden");
  document
    .querySelector(`.card[data-index="${second}"]`)
    .querySelector("img")
    .classList.add("hidden");
});
