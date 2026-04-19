import { WebSocketManager } from "./ws.js";
import { registerEventListeners, setupWebSocketHandlers } from "./events.js";

const SESSION_KEY = "headsup_session";

let playerName = window.playerName || null;
let roomCode = window.roomCode;
let isHost = window.isHost;
let reconnectToken = window.reconnectToken || null;

if (playerName) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ playerName, roomCode, isHost, reconnectToken }));
  history.replaceState(null, "", `/room/${roomCode}`);
} else {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (saved && saved.roomCode === roomCode) {
    ({ playerName, isHost, reconnectToken } = saved);
  } else {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "/";
  }
}

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsManager = new WebSocketManager(`${wsProtocol}//${window.location.host}`);
wsManager.init(roomCode, playerName, isHost, reconnectToken);

setupWebSocketHandlers(wsManager);
registerEventListeners(wsManager);

document.getElementById("room-code").textContent = roomCode;
