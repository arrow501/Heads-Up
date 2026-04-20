import { WebSocketServer, WebSocket } from "ws";
import {
  getRoom,
  markRoomStarted,
  addPlayer,
  removePlayer,
  playerExists,
  setPlayerCharacter,
  setPlayerReady,
  getPlayersInRoom,
} from "../models/store.js";
import { fetchImageUrl } from "./apiService.js";

const pendingDisconnects = new Map();

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", function onConnection(ws) {
    ws.on("error", function onWsError(err) {
      console.error(`WS error [${ws.playerName ?? "?"}]:`, err.message);
    });

    ws.on("message", function onMessage(data) {
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        console.error("Received malformed WS message");
        return;
      }
      handleMessage(message, wss, ws);
    });

    ws.on("close", function onClose() {
      const { playerName, roomCode } = ws;
      if (!playerName || !roomCode) return;

      const key = `${roomCode}:${playerName}`;
      const timer = setTimeout(() => {
        pendingDisconnects.delete(key);
        const roomAlive = removePlayer(roomCode, playerName);
        console.log(`Player ${playerName} removed from room ${roomCode} after grace period`);
        if (roomAlive) {
          broadcastToRoom(roomCode, buildRoomState(roomCode), wss);
        }
      }, 15_000);
      pendingDisconnects.set(key, timer);
    });

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30_000);

    ws.on("close", () => clearInterval(pingInterval));
  });

  return wss;
}

function handleMessage(message, wss, ws) {
  switch (message.type) {
    case "get-data-from-db":
      handleGetData(message, wss, ws);
      break;
    case "reconnect":
      handleReconnect(message, wss, ws);
      break;
    case "sendCharacters":
      handleSendCharacters(message, wss, ws);
      break;
    case "start-game":
      handleStartGame(message, wss, ws);
      break;
    default:
      broadcastToRoom(message.roomCode, message, wss);
      break;
  }
}

function handleGetData(message, wss, ws) {
  if (message.name && message.roomCode) {
    ws.playerName = message.name;
    ws.roomCode = message.roomCode;
  }
  broadcastToRoom(message.roomCode, buildRoomState(message.roomCode), wss);
}

function handleReconnect(message, wss, ws) {
  const room = getRoom(message.roomCode);
  const player = room?.players.get(message.playerName);

  if (!player || player.reconnectToken !== message.reconnectToken) {
    ws.send(JSON.stringify({ type: "reconnect-failed" }));
    return;
  }

  const key = `${message.roomCode}:${message.playerName}`;
  const timer = pendingDisconnects.get(key);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnects.delete(key);
  }

  ws.playerName = message.playerName;
  ws.roomCode = message.roomCode;

  broadcastToRoom(message.roomCode, buildRoomState(message.roomCode), wss);
}

async function handleSendCharacters(message, wss, ws) {
  try {
    message.url = await fetchImageUrl(message.character);
    broadcastToRoom(message.roomCode, message, wss);
    setPlayerReady(message.roomCode, message.playerName);
    setPlayerCharacter(message.roomCode, message.opponentName, message.character, message.url);
  } catch (err) {
    console.error("Error in sendCharacters:", err);
  }
}

function handleStartGame(message, wss, ws) {
  markRoomStarted(message.roomCode);
  broadcastToRoom(message.roomCode, message, wss);
}

function broadcastToRoom(roomCode, message, wss) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.roomCode === roomCode) {
      client.send(payload);
    }
  });
}

function buildRoomState(roomCode) {
  const room = getRoom(roomCode);
  return {
    type: "dataFromDb",
    roomCode,
    hasStarted: room?.hasStarted ?? false,
    data: getPlayersInRoom(roomCode).map((p) => ({
      name: p.name,
      character: p.character,
      isready: p.isReady ? 1 : null,
      url: p.url,
    })),
  };
}
