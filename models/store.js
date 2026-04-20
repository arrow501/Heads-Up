import { randomUUID } from "crypto";

const rooms = new Map();

export function roomExists(code) {
  return rooms.has(code);
}

export function createRoom(code) {
  const room = { code, hasStarted: false, players: new Map() };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code);
}

export function markRoomStarted(code) {
  const room = rooms.get(code);
  if (room) room.hasStarted = true;
}

export function addPlayer(code, name) {
  const room = rooms.get(code);
  if (!room) throw new Error(`Room ${code} not found`);
  const player = { name, isReady: false, character: null, url: null, reconnectToken: randomUUID() };
  room.players.set(name, player);
  return player;
}

export function removePlayer(code, name) {
  const room = rooms.get(code);
  if (!room) return false;
  room.players.delete(name);
  if (room.players.size === 0) {
    rooms.delete(code);
    return false;
  }
  return true;
}

export function playerExists(code, name) {
  return rooms.get(code)?.players.has(name) ?? false;
}

export function setPlayerCharacter(code, name, character, url) {
  const player = rooms.get(code)?.players.get(name);
  if (player) {
    player.character = character;
    player.url = url;
  }
}

export function setPlayerReady(code, name) {
  const player = rooms.get(code)?.players.get(name);
  if (player) player.isReady = true;
}

export function getPlayersInRoom(code) {
  return [...(rooms.get(code)?.players.values() ?? [])];
}
