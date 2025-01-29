let ws;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket() {
  ws = new WebSocket("ws://localhost:3001");

  ws.onopen = () => {
    console.log("Connected to server");
    reconnectAttempts = 0;
    updateConnectionStatus(true);
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
    updateConnectionStatus(false);

    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${reconnectAttempts}`);
      setTimeout(connectWebSocket, 2000);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    updateConnectionStatus(false);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };
}

function updateConnectionStatus(connected) {
  const statusElement = document.createElement("div");
  statusElement.className = `fixed top-4 right-4 px-4 py-2 rounded ${
    connected ? "bg-green-500" : "bg-red-500"
  } text-white`;
  statusElement.textContent = connected ? "Connected" : "Disconnected";

  const existingStatus = document.querySelector(".fixed.top-4.right-4");
  if (existingStatus) {
    existingStatus.remove();
  }
  document.body.appendChild(statusElement);
}

function sendMessage(data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  } else {
    console.log("WebSocket is not connected. Message not sent:", data);
  }
}

function handleMessage(data) {
  switch (data.type) {
    case "gameCreated":
      menu.classList.add("hidden");
      gameDiv.classList.remove("hidden");
      renderCards(data.cards);
      break;

    case "cardFlipped":
      const card = document.querySelector(`.card[data-index="${data.index}"]`);
      card.querySelector("img").classList.remove("hidden");
      break;

    case "matchFound":
      document
        .querySelector(`.card[data-index="${data.first}"]`)
        .classList.add("opacity-50");
      document
        .querySelector(`.card[data-index="${data.second}"]`)
        .classList.add("opacity-50");
      break;

    case "resetCards":
      document
        .querySelector(`.card[data-index="${data.first}"]`)
        .querySelector("img")
        .classList.add("hidden");
      document
        .querySelector(`.card[data-index="${data.second}"]`)
        .querySelector("img")
        .classList.add("hidden");
      break;
  }
}

const app = document.getElementById("app");
const menu = document.getElementById("menu");
const gameDiv = document.getElementById("game");
const createGameBtn = document.getElementById("createGame");
const joinGameBtn = document.getElementById("joinGame");
const gameCodeInput = document.getElementById("gameCode");

createGameBtn.addEventListener("click", () => {
  sendMessage({
    type: "createGame",
    cardSet: "default",
    cardCount: 12,
  });
});

joinGameBtn.addEventListener("click", () => {
  const gameCode = gameCodeInput.value;
  if (gameCode) {
    sendMessage({
      type: "joinGame",
      gameCode,
    });
  }
});

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
      sendMessage({
        type: "flipCard",
        gameCode: gameCodeInput.value,
        index: card.dataset.index,
      });
    });
  });
}

// Initialize WebSocket connection
connectWebSocket();
