import { WebSocketManager } from "./ws.js";
import { registerEventListeners, setupWebSocketHandlers } from "./events.js";

// Load the variables from the index.ejs
const playerName = window.playerName;
const roomCode = window.roomCode;
const isHost = window.isHost;

// Initialize webSocket
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsManager = new WebSocketManager(`${wsProtocol}//${window.location.host}`);
wsManager.init(roomCode, playerName, isHost);

// Set up WebSocket message handlers
setupWebSocketHandlers(wsManager);

// Set up event listeners
registerEventListeners(wsManager);

// Display the room code on the screen
const roomCodeParagraph = document.getElementById("room-code");
roomCodeParagraph.textContent = roomCode;
